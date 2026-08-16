# Nokotuber no macOS — build e teste (v0.4.0)

> Estado: **🟠 CI preparado; build macOS ainda não executado / não testado em Mac real.**
> O código é portável e o CI (GitHub Actions) compila para Apple Silicon e Intel,
> mas nada foi validado num Mac de verdade. **Não afirme que "funciona no Mac"**
> antes de um teste funcional em Mac real. Após o CI rodar: *"Build macOS validado
> em CI; teste funcional em Mac real pendente."*

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

## CI (GitHub Actions) — validação de build sem Mac
Workflow: [`.github/workflows/build-macos.yml`](.github/workflows/build-macos.yml).
- Dispara em **`workflow_dispatch`** (manual) e em **`pull_request`**.
- Compila **dois alvos separados**, em runners nativos:
  - `aarch64-apple-darwin` (Apple Silicon) no runner `macos-14`;
  - `x86_64-apple-darwin` (Intel) no runner `macos-13`.
- Publica os bundles como **Artifacts** (não cria Release): baixe em
  **Actions → run → Artifacts**:
  - `Nokotuber-v0.4.0-macos-apple-silicon`
  - `Nokotuber-v0.4.0-macos-intel`
- **Não** roda o `store-backend` (Postgres/Mercado Pago/`.env`) — só compila o
  desktop; o cliente da Loja usa fallback padrão de URL. Sem segredos no workflow.
- **Não** assina/notariza — os artefatos são para **teste privado**.

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

---

# Nokotuber — teste em Mac real (envie junto com o artifact)

## Instalação
1. Baixe o build **correto** para o seu Mac:
   - **Apple Silicon** (`…-macos-apple-silicon`) para M1/M2/M3/M4/etc.;
   - **Intel** (`…-macos-intel`) para Macs Intel.
   - (Na dúvida: menu Apple → "Sobre este Mac" → "Chip".)
2. Descompacte e arraste o `Nokotuber.app` para **Aplicativos** (ou abra o `.dmg`).
3. **Gatekeeper** (app de teste **não notarizado**): ao abrir, o macOS pode dizer
   que o app "não pôde ser verificado". Para autorizar um build de teste:
   - **clique com o botão direito** no app → **Abrir** → **Abrir** de novo; ou
   - Ajustes do Sistema → **Privacidade e Segurança** → em "Segurança", clique em
     **"Abrir mesmo assim"**; ou
   - Terminal: `xattr -dr com.apple.quarantine /Applications/Nokotuber.app`.

## Testes (marque)
- [ ] O app **abre** sem crash ao iniciar.
- [ ] Um **projeto abre** e **salva** (`.noko`) — diálogos nativos funcionam.
- [ ] O **microfone aparece** na lista de dispositivos.
- [ ] O macOS **solicita permissão de microfone** na 1ª captura.
- [ ] O **avatar reage à fala** (boca abre/fecha).
- [ ] **Piscada** funciona.
- [ ] **Expressões** funcionam.
- [ ] **Expressão de grito** funciona (falar alto troca o rosto).
- [ ] **Visemas manuais** funcionam (formatos de boca A/E/I/O/U).
- [ ] **Acessórios** aparecem/editam.
- [ ] A **Loja** abre; **login** funciona; **Minha Biblioteca** lista os itens.
- [ ] Um **acessório adquirido** aparece no personagem.
- [ ] **Modo Sala** funciona; **Companion** conecta (localhost e via Radmin/Hamachi).
- [ ] **Modo Janela** abre e o **OBS** consegue capturar a janela.
- [ ] **Fechar/reabrir** mantém as configurações.

## Informe (para diagnóstico)
```text
Modelo do Mac:
Chip:
Versão do macOS:
Erro encontrado:
```

> Observação: a Loja precisa do **backend rodando** (localhost:8080 por padrão) e,
> entre máquinas diferentes, de Radmin/Hamachi para o Companion — igual ao Windows.
