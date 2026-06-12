// Discord RPC — conexão REAL ao cliente Discord local pelo socket IPC oficial.
// SEM token pessoal, SEM selfbot, SEM scraping, SEM API não-oficial.

use std::io::{Read, Write, BufRead, BufReader};
use std::net::TcpListener;
use std::sync::Mutex;
use serde_json::{json, Value};

/// Stream duplex (named pipe no Windows, unix socket no Linux/macOS).
trait IpcStream: Read + Write + Send {}
impl<T: Read + Write + Send> IpcStream for T {}

static CONN: Mutex<Option<Box<dyn IpcStream>>> = Mutex::new(None);

const MSG_CLOSED: &str    = "Não foi possível conectar ao Discord local. Verifique se o Discord está aberto.";
const MSG_HANDSHAKE: &str = "O Discord recusou a conexão. Verifique o Application ID e se o app tem RPC habilitado.";
const MSG_AUTH: &str      = "Autenticar a leitura de voz exige uma aplicação Discord aprovada para RPC. Use o modo manual por enquanto.";

// ───────────────────────── Socket IPC ─────────────────────────

fn open_ipc() -> Option<Box<dyn IpcStream>> {
    for i in 0..10 {
        #[cfg(windows)]
        {
            use std::fs::OpenOptions;
            let path = format!(r"\\.\pipe\discord-ipc-{}", i);
            if let Ok(f) = OpenOptions::new().read(true).write(true).open(&path) {
                return Some(Box::new(f));
            }
        }
        #[cfg(unix)]
        {
            use std::os::unix::net::UnixStream;
            let base = std::env::var("XDG_RUNTIME_DIR")
                .or_else(|_| std::env::var("TMPDIR"))
                .unwrap_or_else(|_| "/tmp".to_string());
            let path = format!("{}/discord-ipc-{}", base.trim_end_matches('/'), i);
            if let Ok(s) = UnixStream::connect(&path) {
                return Some(Box::new(s));
            }
        }
    }
    None
}

fn send_frame(stream: &mut Box<dyn IpcStream>, opcode: u32, payload: &str) -> std::io::Result<()> {
    let bytes = payload.as_bytes();
    let mut frame = Vec::with_capacity(8 + bytes.len());
    frame.extend_from_slice(&opcode.to_le_bytes());
    frame.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
    frame.extend_from_slice(bytes);
    stream.write_all(&frame)?;
    stream.flush()
}

fn read_frame(stream: &mut Box<dyn IpcStream>) -> std::io::Result<(u32, String)> {
    let mut head = [0u8; 8];
    stream.read_exact(&mut head)?;
    let opcode = u32::from_le_bytes([head[0], head[1], head[2], head[3]]);
    let len = u32::from_le_bytes([head[4], head[5], head[6], head[7]]) as usize;
    let mut buf = vec![0u8; len];
    if len > 0 { stream.read_exact(&mut buf)?; }
    Ok((opcode, String::from_utf8_lossy(&buf).to_string()))
}

// ───────────────────────── R1: conexão / handshake ─────────────────────────

#[tauri::command(async)]
pub fn discord_rpc_connect(application_id: String) -> Result<(), String> {
    let app_id: String = application_id.trim().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    if app_id.is_empty() {
        return Err("Informe o Application ID do Discord Developer Portal.".into());
    }
    let mut stream = open_ipc().ok_or_else(|| MSG_CLOSED.to_string())?;
    let handshake = format!("{{\"v\":1,\"client_id\":\"{}\"}}", app_id);
    send_frame(&mut stream, 0, &handshake).map_err(|_| MSG_CLOSED.to_string())?;
    match read_frame(&mut stream) {
        Ok((1, payload)) if payload.contains("READY") || payload.contains("DISPATCH") => {
            *CONN.lock().unwrap() = Some(stream); Ok(())
        }
        Ok((_, payload)) if payload.contains("READY") => {
            *CONN.lock().unwrap() = Some(stream); Ok(())
        }
        Ok(_)  => Err(MSG_HANDSHAKE.to_string()),
        Err(_) => Err(MSG_CLOSED.to_string()),
    }
}

#[tauri::command]
pub fn discord_rpc_disconnect() -> Result<(), String> {
    *CONN.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub fn discord_rpc_authenticate() -> Result<(), String> {
    Err(MSG_AUTH.to_string()) // stub honesto usado no connect
}

#[tauri::command]
pub fn discord_rpc_get_selected_voice_channel() -> Result<Option<String>, String> {
    Ok(None) // R3
}

#[tauri::command]
pub fn discord_rpc_subscribe_voice_events(channel_id: String) -> Result<(), String> {
    let _ = channel_id;
    Err(MSG_AUTH.to_string()) // R3
}

// ───────────────────────── Helpers RPC ─────────────────────────

fn new_nonce(tag: &str) -> String {
    let n = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    format!("noko-{tag}-{n}")
}

fn truncate(s: &str, max: usize) -> String {
    let t: String = s.chars().take(max).collect();
    if t.len() < s.len() { format!("{t}…") } else { t }
}

fn rpc_error_text(v: &Value) -> String {
    let code = v.pointer("/data/code").and_then(|c| c.as_i64()).unwrap_or(0);
    let msg = v.pointer("/data/message").and_then(|m| m.as_str()).unwrap_or("erro desconhecido");
    let lower = msg.to_lowercase();
    let hint = if lower.contains("scope") {
        " — scope não concedido: confira se o app tem 'rpc'/'rpc.voice.read' e se sua conta está na lista de Testadores RPC."
    } else if lower.contains("redirect_uri") {
        " — esse fluxo não deveria pedir redirect_uri; me avise."
    } else if code == 4011 {
        " — autorização negada pelo usuário."
    } else if code == 4006 {
        " — não autenticado."
    } else { "" };
    format!("Discord (code {code}): {msg}{hint}")
}

/// Envia um comando (op 1) na conexão atual e lê frames até achar a resposta do nosso nonce.
fn rpc_command(payload: &str, nonce: &str) -> Result<String, String> {
    let mut guard = CONN.lock().map_err(|_| "Estado de conexão inválido.".to_string())?;
    let stream = guard.as_mut().ok_or_else(|| "Não conectado ao Discord. Clique em Conectar primeiro.".to_string())?;
    send_frame(stream, 1, payload).map_err(|_| MSG_CLOSED.to_string())?;
    for _ in 0..30 {
        let (op, body) = read_frame(stream).map_err(|_| MSG_CLOSED.to_string())?;
        if op == 2 {
            return Err(format!("O Discord encerrou a conexão RPC: {}", truncate(&body, 300)));
        }
        if body.contains(nonce) { return Ok(body); }
    }
    Err("Não recebi a resposta correspondente do Discord (limite de frames).".to_string())
}

// ───────────────────────── R2: AUTHORIZE / troca / AUTHENTICATE ─────────────────────────

/// AUTHORIZE clássico via socket RPC (mostra o modal no Discord). Sem PKCE/redirect — devolve o code.
#[tauri::command(async)]
pub fn discord_rpc_authorize(application_id: String, scopes: Vec<String>) -> Result<String, String> {
    let app_id: String = application_id.trim().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    if app_id.is_empty() { return Err("Application ID vazio.".into()); }
    let nonce = new_nonce("authorize");
    let payload = json!({
        "cmd": "AUTHORIZE",
        "args": { "client_id": app_id, "scopes": scopes },
        "nonce": nonce
    }).to_string();

    let resp = rpc_command(&payload, &nonce)?;
    let v: Value = serde_json::from_str(&resp).map_err(|e| format!("Resposta inválida do Discord: {e}"))?;
    if v.get("evt").and_then(|x| x.as_str()) == Some("ERROR") {
        return Err(rpc_error_text(&v));
    }
    match v.pointer("/data/code").and_then(|c| c.as_str()) {
        Some(code) => Ok(code.to_string()),
        None => Err(format!("AUTHORIZE não retornou 'code'. Resposta: {}", truncate(&resp, 300))),
    }
}

/// Troca code → access_token. DEV: usa o secret de NOKOTUBER_DISCORD_SECRET (nunca embutido).
/// PROD: deve virar um endpoint mínimo de troca (sem secret no app).
#[tauri::command(async)]
pub fn discord_rpc_exchange_secret(application_id: String, code: String, redirect_uri: String) -> Result<String, String> {
    let app_id: String = application_id.trim().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    let secret = std::env::var("NOKOTUBER_DISCORD_SECRET").unwrap_or_default();
    if secret.trim().is_empty() {
        return Err("Defina a variável de ambiente NOKOTUBER_DISCORD_SECRET (só para teste local). Em produção isso vira um endpoint de troca de token.".into());
    }
    let mut form: Vec<(&str, &str)> = vec![
        ("client_id", app_id.as_str()),
        ("client_secret", secret.as_str()),
        ("grant_type", "authorization_code"),
        ("code", code.as_str()),
    ];
    if !redirect_uri.trim().is_empty() { form.push(("redirect_uri", redirect_uri.as_str())); }

    match ureq::post("https://discord.com/api/oauth2/token").send_form(&form) {
        Ok(r) => {
            let body = r.into_string().unwrap_or_default();
            let v: Value = serde_json::from_str(&body).map_err(|e| format!("Token: resposta inválida: {e}"))?;
            match v.get("access_token").and_then(|t| t.as_str()) {
                Some(tok) => Ok(tok.to_string()),
                None => Err(format!("Troca sem access_token: {}", truncate(&body, 300))),
            }
        }
        Err(ureq::Error::Status(status, r)) => {
            let body = r.into_string().unwrap_or_default();
            Err(format!("Troca de token falhou (HTTP {status}): {}", truncate(&body, 300)))
        }
        Err(e) => Err(format!("Erro de rede na troca de token: {e}")),
    }
}

/// (Isolado — fluxo navegador/PKCE) troca code → token sem secret. Não é o caminho principal.
#[tauri::command(async)]
pub fn discord_rpc_exchange_pkce(application_id: String, code: String, code_verifier: String, redirect_uri: String) -> Result<String, String> {
    let app_id: String = application_id.trim().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    let mut form: Vec<(&str, &str)> = vec![
        ("client_id", app_id.as_str()),
        ("grant_type", "authorization_code"),
        ("code", code.as_str()),
        ("code_verifier", code_verifier.as_str()),
    ];
    if !redirect_uri.is_empty() { form.push(("redirect_uri", redirect_uri.as_str())); }
    match ureq::post("https://discord.com/api/oauth2/token").send_form(&form) {
        Ok(r) => {
            let body = r.into_string().unwrap_or_default();
            let v: Value = serde_json::from_str(&body).map_err(|e| format!("Token: resposta inválida: {e}"))?;
            match v.get("access_token").and_then(|t| t.as_str()) {
                Some(tok) => Ok(tok.to_string()),
                None => Err(format!("Troca PKCE sem access_token: {}", truncate(&body, 300))),
            }
        }
        Err(ureq::Error::Status(status, r)) => {
            let body = r.into_string().unwrap_or_default();
            Err(format!("Troca PKCE falhou (HTTP {status}): {}", truncate(&body, 300)))
        }
        Err(e) => Err(format!("Erro de rede na troca PKCE: {e}")),
    }
}

/// AUTHENTICATE pelo socket RPC com o token obtido. Retorna o nome do usuário em caso de sucesso.
#[tauri::command(async)]
pub fn discord_rpc_authenticate_token(access_token: String) -> Result<String, String> {
    let nonce = new_nonce("authenticate");
    let payload = json!({
        "cmd": "AUTHENTICATE",
        "args": { "access_token": access_token },
        "nonce": nonce
    }).to_string();
    let resp = rpc_command(&payload, &nonce)?;
    let v: Value = serde_json::from_str(&resp).map_err(|e| format!("Resposta inválida: {e}"))?;
    if v.get("evt").and_then(|x| x.as_str()) == Some("ERROR") {
        return Err(rpc_error_text(&v));
    }
    let name = v.pointer("/data/user/username").and_then(|x| x.as_str()).unwrap_or("usuário Discord");
    Ok(name.to_string())
}

// ───────────────────────── (Isolado) fluxo navegador/loopback — não é mais chamado ─────────────────────────

fn urlencode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

fn urldecode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(b) = u8::from_str_radix(&s[i + 1..i + 3], 16) { out.push(b); i += 3; continue; }
        }
        if bytes[i] == b'+' { out.push(b' '); } else { out.push(bytes[i]); }
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

fn get_query_param(target: &str, key: &str) -> Option<String> {
    let q = target.split('?').nth(1)?;
    for pair in q.split('&') {
        let mut it = pair.splitn(2, '=');
        if it.next() == Some(key) { return it.next().map(urldecode); }
    }
    None
}

fn open_browser(url: &str) {
    #[cfg(windows)]
    { let _ = std::process::Command::new("cmd").args(["/C", "start", "", url]).spawn(); }
    #[cfg(target_os = "macos")]
    { let _ = std::process::Command::new("open").arg(url).spawn(); }
    #[cfg(all(unix, not(target_os = "macos")))]
    { let _ = std::process::Command::new("xdg-open").arg(url).spawn(); }
}

#[tauri::command(async)]
pub fn discord_oauth_pkce_authorize(application_id: String, scopes: Vec<String>, code_challenge: String, port: u16) -> Result<Value, String> {
    let app_id: String = application_id.trim().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    if app_id.is_empty() { return Err("Application ID vazio.".into()); }

    let addr = format!("127.0.0.1:{port}");
    let listener = TcpListener::bind(&addr).map_err(|e| format!("Não consegui abrir a porta local {port}: {e}."))?;
    listener.set_nonblocking(true).ok();
    let redirect = format!("http://{addr}/callback");

    let scope_str = scopes.join(" ");
    let url = format!(
        "https://discord.com/oauth2/authorize?client_id={}&response_type=code&scope={}&redirect_uri={}&code_challenge={}&code_challenge_method=S256&prompt=consent",
        app_id, urlencode(&scope_str), urlencode(&redirect), urlencode(&code_challenge)
    );
    open_browser(&url);

    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(90);
    let mut stream = loop {
        match listener.accept() {
            Ok((s, _)) => break s,
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                if std::time::Instant::now() > deadline {
                    return Err("Tempo esgotado esperando a autorização no navegador.".into());
                }
                std::thread::sleep(std::time::Duration::from_millis(150));
            }
            Err(e) => return Err(format!("Falha ao receber o callback do navegador: {e}")),
        }
    };
    stream.set_nonblocking(false).ok();

    let mut request_line = String::new();
    {
        let mut reader = BufReader::new(&stream);
        reader.read_line(&mut request_line).map_err(|e| format!("Falha ao ler o callback: {e}"))?;
    }
    let _ = stream.write_all(
        b"HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<html><body style=\"font-family:sans-serif;background:#1c1818;color:#f4ebe8;text-align:center;padding-top:60px\"><h2>Nokotuber</h2><p>Autorizacao recebida. Pode fechar esta aba e voltar ao app.</p></body></html>"
    );
    let _ = stream.flush();

    let target = request_line.split_whitespace().nth(1).unwrap_or("");
    let mut out = serde_json::Map::new();
    out.insert("redirect_uri".into(), Value::String(redirect));
    if let Some(c) = get_query_param(target, "code")  { out.insert("code".into(),  Value::String(c)); }
    if let Some(e) = get_query_param(target, "error") { out.insert("error".into(), Value::String(e)); }
    Ok(Value::Object(out))
}