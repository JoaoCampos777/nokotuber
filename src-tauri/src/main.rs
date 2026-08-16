#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod discord_rpc;
mod companion_server;
use base64::{engine::general_purpose, Engine as _};
use serde_json::Value;
use std::fs;
use std::io::Write;
use tauri::{AppHandle, Manager};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

const PERF_LABEL: &str = "performance";

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Mostra ou oculta a janela "Janela" (performance).
/// Retorna `true` se ficou visível, `false` se foi ocultada.
#[tauri::command]
fn toggle_performance_window(app: AppHandle) -> Result<bool, String> {
    let win = app
        .get_webview_window(PERF_LABEL)
        .ok_or_else(|| "Janela de performance não encontrada".to_string())?;

    let visible = win.is_visible().unwrap_or(false);
    if visible {
        win.hide().map_err(|e| format!("Falha ao ocultar: {e}"))?;
        Ok(false)
    } else {
        win.show().map_err(|e| format!("Falha ao mostrar: {e}"))?;
        let _ = win.set_focus();
        Ok(true)
    }
}

/// Oculta a janela (chamado pelo Escape dentro dela).
#[tauri::command]
fn close_performance_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(PERF_LABEL) {
        win.hide().map_err(|e| format!("Falha ao ocultar: {e}"))?;
    }
    Ok(())
}

/// Abre uma URL no navegador padrão do sistema (usado pela Loja para o checkout).
#[tauri::command]
fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| format!("Falha ao abrir URL: {e}"))
}

#[tauri::command]
fn read_image_as_base64(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Erro ao ler arquivo: {e}"))?;
    let mime = if path.ends_with(".png") { "image/png" }
               else if path.ends_with(".jpg") || path.ends_with(".jpeg") { "image/jpeg" }
               else if path.ends_with(".webp") { "image/webp" }
               else if path.ends_with(".gif") { "image/gif" }
               else { "image/png" };
    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}

#[tauri::command]
fn save_project_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Erro ao salvar: {e}"))?;
    Ok(())
}

#[tauri::command]
fn open_project_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Erro ao ler projeto: {e}"))
}

#[tauri::command]
fn export_project_zip(zip_path: String, project_json: String) -> Result<(), String> {
    let mut project: Value = serde_json::from_str(&project_json)
        .map_err(|e| format!("JSON inválido: {e}"))?;

    let file = fs::File::create(&zip_path).map_err(|e| format!("Erro ao criar ZIP: {e}"))?;
    let mut zip = ZipWriter::new(file);
    let options: SimpleFileOptions = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    if let Some(images) = project.get_mut("images").and_then(|v| v.as_object_mut()) {
        let slots = ["mouthClosed", "mouthOpen", "blinkClosed", "blinkOpen"];
        for slot in &slots {
            let data_url_opt = images.get(*slot).and_then(|v| v.as_str()).map(String::from);
            if let Some(data_url) = data_url_opt {
                if data_url.starts_with("data:image/") {
                    if let Some(comma_idx) = data_url.find(',') {
                        let header = &data_url[..comma_idx];
                        let b64    = &data_url[(comma_idx + 1)..];
                        let ext = if header.contains("png") { "png" }
                                  else if header.contains("jpeg") || header.contains("jpg") { "jpg" }
                                  else if header.contains("webp") { "webp" }
                                  else { "png" };
                        let bytes = general_purpose::STANDARD.decode(b64)
                            .map_err(|e| format!("Base64 inválido em {slot}: {e}"))?;
                        let img_path = format!("images/{}.{}", slot, ext);
                        zip.start_file(&img_path, options).map_err(|e| format!("ZIP: {e}"))?;
                        zip.write_all(&bytes).map_err(|e| format!("ZIP write: {e}"))?;
                        images.insert(slot.to_string(), Value::String(img_path));
                    }
                }
            }
        }
    }

    let pretty = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Erro ao serializar: {e}"))?;
    zip.start_file("project.json", options).map_err(|e| format!("ZIP: {e}"))?;
    zip.write_all(pretty.as_bytes()).map_err(|e| format!("ZIP: {e}"))?;

    let readme = "Nokotuber Project Export\n\nContents:\n- project.json: project configuration\n- images/: avatar PNG files referenced by project.json\n";
    zip.start_file("README.txt", options).map_err(|e| format!("ZIP: {e}"))?;
    zip.write_all(readme.as_bytes()).map_err(|e| format!("ZIP: {e}"))?;

    zip.finish().map_err(|e| format!("Erro finalizando ZIP: {e}"))?;
    Ok(())
}

#[tauri::command]
fn open_companion_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("companion") { let _ = w.set_focus(); return Ok(()); }
    tauri::WebviewWindowBuilder::new(&app, "companion", tauri::WebviewUrl::App("index.html?mode=companion".into()))
        .title("Nokotuber Companion")
        .inner_size(440.0, 680.0)
        .build()
        .map_err(|e| format!("Falha ao abrir janela Companion: {e}"))?;
    Ok(())
}

/// Mostra a "Janela do Companion" (companion-stage). A janela é definida
/// estaticamente em tauri.conf.json (criada na inicialização, oculta), pois
/// criar a WebView em runtime dentro de um comando não carrega a página.
/// Aqui só a tornamos visível e focada.
#[tauri::command]
fn open_companion_performance_window(app: AppHandle) -> Result<(), String> {
    let win = app
        .get_webview_window("companion-stage")
        .ok_or_else(|| "Janela do Companion não encontrada".to_string())?;
    win.show().map_err(|e| format!("Falha ao mostrar a Janela do Companion: {e}"))?;
    let _ = win.set_focus();
    Ok(())
}

/// Oculta a Janela do Companion (chamado pelo Escape dentro dela).
#[tauri::command]
fn close_companion_performance_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("companion-stage") {
        win.hide().map_err(|e| format!("Falha ao ocultar: {e}"))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            app_version,
            toggle_performance_window,
            close_performance_window,
            open_external_url,
            read_image_as_base64,
            save_project_file,
            open_project_file,
            export_project_zip,
            discord_rpc::discord_rpc_connect,
            discord_rpc::discord_rpc_authenticate,
            discord_rpc::discord_rpc_disconnect,
            discord_rpc::discord_rpc_get_selected_voice_channel,
            discord_rpc::discord_rpc_subscribe_voice_events,
            discord_rpc::discord_rpc_authorize,
            discord_rpc::discord_rpc_exchange_pkce,
            discord_rpc::discord_rpc_authenticate_token,
            discord_rpc::discord_oauth_pkce_authorize,
            discord_rpc::discord_rpc_exchange_secret,
            companion_server::companion_server_start,
            companion_server::companion_server_stop,
            companion_server::companion_server_broadcast,
            open_companion_window,
            open_companion_performance_window,
            close_companion_performance_window,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                match window.label() {
                    "main" => window.app_handle().exit(0),
                    // A Janela do Companion é reutilizável: ocultar em vez de destruir.
                    "companion-stage" => { api.prevent_close(); let _ = window.hide(); }
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Falha ao iniciar o Nokotuber");
}

fn main() { run(); }