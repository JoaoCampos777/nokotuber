# Nokotuber no macOS — preparação de build

> Estado: **preparado, não testado em Mac real.** O código é portável (ver auditoria)
> e o essencial de macOS já está configurado, mas nada aqui foi validado num Mac.
> Não afirme que "funciona no Mac" antes de rodar e testar num Mac de verdade.

## O que já está pronto
- **Servidor Room/Companion** usa `std::net` + `tungstenite` (portável); IP local
  via `UdpSocket` (sem pacotes). Sem código Windows-only.
- **Discord IPC** (`src-tauri/src/discord_rpc.rs`) já tem `#[cfg(windows)]` /
  `#[cfg(unix)]` / `#[cfg(target_os = "macos")]`.
- **Bundle** `targets: "all"` + ícone `.icns`; `bundle.macOS.minimumSystemVersion`
  e `bundle.category` definidos.
- **`src-tauri/Info.plist`** com `NSMicrophoneUsageDescription` — WKWebView exige
  essa chave para o `getUserMedia` (microfone) funcionar; Windows ignora o arquivo.
- `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` no `main.rs`
  é no-op em macOS (só afeta Windows).

## Pré-requisitos no Mac
- Xcode Command Line Tools: `xcode-select --install`
- Rust (rustup) + Node LTS + `pnpm`
- Alvos p/ binário universal (opcional): 
  `rustup target add aarch64-apple-darwin x86_64-apple-darwin`

## Build
```bash
pnpm install
pnpm tauri build                      # gera .app + .dmg para a arquitetura atual
pnpm tauri build --target universal-apple-darwin   # binário universal (Intel+Apple Silicon)
```
Saída em `src-tauri/target/release/bundle/macos/*.app` e `.../dmg/*.dmg`.

## Permissão de microfone
Na primeira captura, o macOS mostra o prompt de permissão (graças ao
`NSMicrophoneUsageDescription`). Se for negada, liberar em
Ajustes do Sistema → Privacidade e Segurança → Microfone.

## Assinatura / notarização (só para distribuir fora da sua máquina)
Sem assinar, o Gatekeeper bloqueia em outros Macs. Para distribuir:
- Assinar com Developer ID e **notarizar** (Tauri suporta via variáveis
  `APPLE_CERTIFICATE`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`).
- App Store exige sandbox + entitlement `com.apple.security.device.audio-input`
  (adicionar um `entitlements.plist` e referenciar em `bundle.macOS.entitlements`).
  Não necessário para uso local/dev.

## A validar num Mac real (checklist)
- [ ] `pnpm tauri build` conclui e abre o `.app`
- [ ] Microfone: prompt aparece e o avatar anima ao falar
- [ ] Janela de performance (transparente/chroma) captura no OBS do Mac
- [ ] Servidor Room inicia; Companion conecta (localhost e via VPN)
- [ ] Salvar/abrir `.noko` e importar imagens (diálogos nativos)
- [ ] Discord IPC (se usado) conecta pelo unix socket
