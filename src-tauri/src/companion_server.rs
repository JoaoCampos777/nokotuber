// Servidor WebSocket local do Nokotuber Room. Recebe fala dos Companions e
// repassa pro frontend via eventos Tauri. Sem cloud, sem login, rede local.

use std::net::{TcpListener, TcpStream, UdpSocket};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::Mutex;
use std::time::Duration;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use tungstenite::{accept, Message};

static RUNNING: AtomicBool = AtomicBool::new(false);
static ROOM_CODE: Mutex<String> = Mutex::new(String::new());

// Registro de clientes conectados, para o Host poder ENVIAR mensagens.
// Cada cliente tem DUAS filas: alta prioridade (participant_speaking/reaction,
// heartbeat) e baixa (room_snapshot, grande). A thread do cliente drena a ALTA
// antes da BAIXA, para que um evento leve nunca fique preso atrás de um snapshot.
struct ClientTx { id: u64, hi: Sender<String>, lo: Sender<String> }
static CLIENTS: Mutex<Vec<ClientTx>> = Mutex::new(Vec::new());
static NEXT_CONN_ID: AtomicU64 = AtomicU64::new(1);

fn register_client(c: ClientTx) { CLIENTS.lock().unwrap().push(c); }
fn unregister_client(id: u64) { CLIENTS.lock().unwrap().retain(|c| c.id != id); }

/// Envia uma mensagem (texto JSON) para todos os Companions conectados.
/// `high_priority` = evento leve (fala/reação) → fila rápida; caso contrário
/// (snapshot) → fila lenta. No-op se não houver clientes.
#[tauri::command]
pub fn companion_server_broadcast(message: String, high_priority: bool) -> Result<(), String> {
    let clients = CLIENTS.lock().unwrap();
    if message.len() > 8192 {
        eprintln!("[companion_server] room_snapshot queued bytes={} clients={}", message.len(), clients.len());
    }
    for c in clients.iter() {
        // Canal fechado (cliente já saiu) retorna Err e é ignorado — sem panic,
        // e um cliente com problema não afeta os outros.
        let ch = if high_priority { &c.hi } else { &c.lo };
        let _ = ch.send(message.clone());
    }
    Ok(())
}

fn now_ms() -> u128 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
}

/// Descobre o IP local (sem enviar pacotes — só resolve a rota padrão).
fn local_ip() -> Option<String> {
    let sock = UdpSocket::bind("0.0.0.0:0").ok()?;
    sock.connect("8.8.8.8:80").ok()?;
    sock.local_addr().ok().map(|a| a.ip().to_string())
}

#[tauri::command]
pub fn companion_server_start(app: AppHandle, port: u16, room_code: String) -> Result<Value, String> {
    if RUNNING.load(Ordering::SeqCst) {
        return Err("O servidor já está rodando.".into());
    }
    let listener = TcpListener::bind(("0.0.0.0", port))
        .map_err(|e| format!("Não consegui abrir a porta {port}: {e}. Ela pode estar em uso."))?;
    listener.set_nonblocking(true).map_err(|e| format!("{e}"))?;
    *ROOM_CODE.lock().unwrap() = room_code.trim().to_uppercase();
    RUNNING.store(true, Ordering::SeqCst);

    let ip = local_ip().unwrap_or_else(|| "127.0.0.1".to_string());
    eprintln!("[companion_server] server started on {ip}:{port} room={}", ROOM_CODE.lock().unwrap());
    let handle = app.clone();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            if !RUNNING.load(Ordering::SeqCst) { break; }
            match stream {
                Ok(tcp) => { let h = handle.clone(); std::thread::spawn(move || handle_client(tcp, h)); }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(Duration::from_millis(120));
                }
                Err(_) => break,
            }
        }
    });

    Ok(json!({ "ip": ip, "port": port, "url": format!("ws://{ip}:{port}") }))
}

#[tauri::command]
pub fn companion_server_stop() -> Result<(), String> {
    RUNNING.store(false, Ordering::SeqCst);
    CLIENTS.lock().unwrap().clear();
    eprintln!("[companion_server] server stopped");
    Ok(())
}

fn handle_client(tcp: TcpStream, app: AppHandle) {
    let conn_id = NEXT_CONN_ID.fetch_add(1, Ordering::SeqCst);

    // IMPORTANTE: garante socket BLOQUEANTE. No Windows o socket aceito herda o
    // modo não-bloqueante do listener; nesse modo, escrever um room_snapshot
    // grande (imagens em base64) retornava WouldBlock e a conexão caía de forma
    // abrupta (o cliente via "code 1006"). Em modo bloqueante, os writes esperam
    // e completam — sem falso erro fatal.
    if let Err(e) = tcp.set_nonblocking(false) {
        eprintln!("[companion_server] conn {conn_id}: set_nonblocking(false) falhou: {e}");
    }
    // TCP_NODELAY: envia mensagens pequenas (fala/reação) imediatamente, sem
    // esperar o algoritmo de Nagle coalescer (que adicionaria ~40ms de atraso).
    let _ = tcp.set_nodelay(true);

    let mut ws = match accept(tcp) {
        Ok(ws) => ws,
        Err(e) => { eprintln!("[companion_server] conn {conn_id}: handshake falhou: {e}"); return; }
    };

    // Timeout de leitura curto: o loop acorda a cada ~10ms para drenar a fila de
    // envio com baixa latência. Idle NUNCA fecha: WouldBlock/TimedOut = "sem dados".
    let _ = ws.get_ref().set_read_timeout(Some(Duration::from_millis(10)));
    eprintln!("[companion_server] conn {conn_id}: client connected");

    let (tx_hi, rx_hi) = channel::<String>();
    let (tx_lo, rx_lo) = channel::<String>();
    let mut client_id = String::new();
    let mut display_name = String::new();
    let mut authed = false;
    let mut registered = false;

    loop {
        if !RUNNING.load(Ordering::SeqCst) {
            eprintln!("[companion_server] conn {conn_id}: sala encerrada — fechando conexão");
            let _ = ws.close(None);
            let _ = ws.flush();
            break;
        }

        // 1) Drena mensagens do Host → Companion. ALTA prioridade primeiro
        //    (fala/reação), depois BAIXA (snapshot), para eventos leves nunca
        //    ficarem presos atrás de um snapshot grande.
        let mut write_err = false;
        while let Ok(msg) = rx_hi.try_recv() {
            if let Err(e) = ws.send(Message::Text(msg)) {
                eprintln!("[companion_server] conn {conn_id}: write failed (hi): {e}");
                write_err = true; break;
            }
        }
        if !write_err {
            while let Ok(msg) = rx_lo.try_recv() {
                if let Err(e) = ws.send(Message::Text(msg)) {
                    eprintln!("[companion_server] conn {conn_id}: write failed (lo): {e}");
                    write_err = true; break;
                }
            }
        }
        if write_err { break; }

        // 2) Lê mensagem do Companion (bloqueia até ~250ms e volta).
        match ws.read() {
            Ok(Message::Text(txt)) => {
                if txt.len() > 4096 { continue; } // payload de entrada grande demais: ignora
                let v: Value = match serde_json::from_str(&txt) { Ok(v) => v, Err(_) => continue };
                match v.get("type").and_then(|t| t.as_str()).unwrap_or("") {
                    "hello" => {
                        let code = v.get("roomCode").and_then(|c| c.as_str()).unwrap_or("").trim().to_uppercase();
                        let want = ROOM_CODE.lock().unwrap().clone();
                        client_id = v.get("clientId").and_then(|c| c.as_str()).unwrap_or("").to_string();
                        if client_id.is_empty() { client_id = format!("remote_{}", now_ms()); }
                        display_name = v.get("displayName").and_then(|c| c.as_str()).unwrap_or("Participante").to_string();
                        eprintln!("[companion_server] conn {conn_id}: hello room={code} name={display_name}");
                        if !want.is_empty() && code != want {
                            eprintln!("[companion_server] conn {conn_id}: código inválido (esperado {want}) — recusando");
                            let _ = ws.send(Message::Text(json!({"type":"error","message":"Código da sala inválido."}).to_string()));
                            let _ = ws.close(None);
                            let _ = ws.flush();
                            break;
                        }
                        authed = true;
                        let _ = ws.send(Message::Text(json!({
                            "type":"welcome","remoteUserId":client_id,"roomId":want,"hostName":"Nokotuber Host"
                        }).to_string()));
                        eprintln!("[companion_server] conn {conn_id}: welcome sent");
                        register_client(ClientTx { id: conn_id, hi: tx_hi.clone(), lo: tx_lo.clone() });
                        registered = true;
                        let _ = app.emit("companion://join", json!({"id":client_id,"name":display_name}));
                    }
                    "speaking" if authed => {
                        let is = v.get("isSpeaking").and_then(|b| b.as_bool()).unwrap_or(false);
                        let vol = v.get("volume").and_then(|n| n.as_f64()).unwrap_or(0.0);
                        let _ = app.emit("companion://speaking", json!({"id":client_id,"name":display_name,"isSpeaking":is,"volume":vol}));
                    }
                    "request_assets" if authed => {
                        // Companion pediu imagens que faltam no cache dele. Repassa ao
                        // frontend do Host, que envia os room_asset (com throttle).
                        let ids = v.get("assetIds").cloned().unwrap_or_else(|| json!([]));
                        eprintln!("[companion_server] conn {conn_id}: request_assets {ids}");
                        let _ = app.emit("companion://request_assets", ids);
                    }
                    "heartbeat" => {} // keep-alive: só confirma que o cliente está vivo
                    _ => {}
                }
            }
            Ok(Message::Close(frame)) => {
                eprintln!("[companion_server] conn {conn_id}: client closed normally ({frame:?})");
                let _ = ws.close(None);
                let _ = ws.flush();
                break;
            }
            // Ping/Pong/Binary/etc.: sem tratamento necessário.
            Ok(_) => {}
            // Idle: sem dados agora — NÃO fecha a conexão.
            Err(tungstenite::Error::Io(ref e))
                if e.kind() == std::io::ErrorKind::WouldBlock
                    || e.kind() == std::io::ErrorKind::TimedOut => {}
            Err(tungstenite::Error::ConnectionClosed) | Err(tungstenite::Error::AlreadyClosed) => {
                eprintln!("[companion_server] conn {conn_id}: connection closed");
                break;
            }
            Err(e) => {
                eprintln!("[companion_server] conn {conn_id}: read error: {e}");
                break;
            }
        }
    }

    if registered { unregister_client(conn_id); }
    if authed { let _ = app.emit("companion://leave", json!({"id":client_id})); }
    eprintln!("[companion_server] conn {conn_id}: handler finished");
}