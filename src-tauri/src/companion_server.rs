// Servidor WebSocket local do Nokotuber Room. Recebe fala dos Companions e
// repassa pro frontend via eventos Tauri. Sem cloud, sem login, rede local.

use std::net::{TcpListener, TcpStream, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use tungstenite::{accept, Message};

static RUNNING: AtomicBool = AtomicBool::new(false);
static ROOM_CODE: Mutex<String> = Mutex::new(String::new());

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
    Ok(())
}

fn handle_client(tcp: TcpStream, app: AppHandle) {
    tcp.set_read_timeout(Some(Duration::from_millis(500))).ok();
    let mut ws = match accept(tcp) { Ok(ws) => ws, Err(_) => return };

    let mut client_id = String::new();
    let mut display_name = String::new();
    let mut authed = false;

    loop {
        if !RUNNING.load(Ordering::SeqCst) { let _ = ws.close(None); break; }
        match ws.read() {
            Ok(Message::Text(txt)) => {
                if txt.len() > 4096 { continue; } // payload grande demais: ignora
                let v: Value = match serde_json::from_str(&txt) { Ok(v) => v, Err(_) => continue };
                match v.get("type").and_then(|t| t.as_str()).unwrap_or("") {
                    "hello" => {
                        let code = v.get("roomCode").and_then(|c| c.as_str()).unwrap_or("").trim().to_uppercase();
                        let want = ROOM_CODE.lock().unwrap().clone();
                        if !want.is_empty() && code != want {
                            let _ = ws.send(Message::Text(json!({"type":"error","message":"Código da sala inválido."}).to_string()));
                            let _ = ws.close(None);
                            break;
                        }
                        client_id = v.get("clientId").and_then(|c| c.as_str()).unwrap_or("").to_string();
                        if client_id.is_empty() { client_id = format!("remote_{}", now_ms()); }
                        display_name = v.get("displayName").and_then(|c| c.as_str()).unwrap_or("Participante").to_string();
                        authed = true;
                        let _ = ws.send(Message::Text(json!({
                            "type":"welcome","remoteUserId":client_id,"roomId":want,"hostName":"Nokotuber Host"
                        }).to_string()));
                        let _ = app.emit("companion://join", json!({"id":client_id,"name":display_name}));
                    }
                    "speaking" if authed => {
                        let is = v.get("isSpeaking").and_then(|b| b.as_bool()).unwrap_or(false);
                        let vol = v.get("volume").and_then(|n| n.as_f64()).unwrap_or(0.0);
                        let _ = app.emit("companion://speaking", json!({"id":client_id,"name":display_name,"isSpeaking":is,"volume":vol}));
                    }
                    "heartbeat" => {}
                    _ => {}
                }
            }
            Ok(Message::Close(_)) => break,
            Ok(_) => {}
            Err(tungstenite::Error::Io(ref e))
                if e.kind() == std::io::ErrorKind::WouldBlock || e.kind() == std::io::ErrorKind::TimedOut => {}
            Err(_) => break,
        }
    }

    if authed { let _ = app.emit("companion://leave", json!({"id":client_id})); }
}