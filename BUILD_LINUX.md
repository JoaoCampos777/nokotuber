# Nokotuber no Linux — build e teste (v0.4.0)

> Estado: **🟡 Build Linux validado em CI; teste funcional em Linux real pendente.**
> O workflow (GitHub Actions) **compilou e empacotou** com sucesso o alvo
> `x86_64` e gerou **AppImage + DEB + RPM** como Artifacts. Ainda **não** foi
> testado num Linux de verdade. Não afirme que "funciona no Linux" antes de um
> teste funcional (abrir o app, microfone, salvar projeto, Sala/Companion etc.).
> Progressão de status:
> `🟠 preparado` → `🟡 validado em CI` → `🟢 testado em Linux real`.

## Formatos gerados
- **AppImage** — recomendado para quem não quer instalar pacote da distro. Um
  único arquivo executável, sem instalação tradicional.
- **DEB** — para Debian/Ubuntu e derivados (Linux Mint, Pop!_OS, etc.).
- **RPM** — *best-effort* (Fedora/openSUSE/RHEL-like). Só entra se gerar de forma
  estável no CI; **não** é obrigatório nesta rodada.

Arquitetura desta primeira rodada: **`x86_64-unknown-linux-gnu`** apenas.
(ARM64/`aarch64` fica para uma fase futura — o workflow já tem o ponto de
expansão comentado.)

## CI (GitHub Actions) — validação de build sem máquina Linux
Workflow: [`.github/workflows/build-linux.yml`](.github/workflows/build-linux.yml).
- Dispara em **`workflow_dispatch`** (manual) e em **`pull_request`**.
- Roda em **`ubuntu-22.04`** de propósito: base mais antiga = **glibc mais
  compatível** com distros não tão recentes, e já traz `libwebkit2gtk-4.1`
  (exigido pelo Tauri 2). Não migramos para uma imagem mais nova só por existir.
- Passos: instala deps do Tauri/WebKitGTK → `pnpm install` → `pnpm build` →
  `cargo check` (valida os ramos `#[cfg(unix)]`, ex.: Discord IPC) →
  `tauri build --bundles appimage,deb` (obrigatório) → `tauri build --bundles rpm`
  (best-effort, `continue-on-error`) → publica **Artifacts**.
- **Não** cria/publica Release. **Não** assina. **Não** roda o `store-backend`
  (Postgres/Mercado Pago/`.env`) — só o desktop é compilado.
- Artifact: `Nokotuber-v0.4.0-linux-x86_64` (contendo `.AppImage`, `.deb` e,
  se gerado, `.rpm`).

## Dependências do Tauri 2 (Ubuntu/Debian) — usadas no CI
```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```
> Tauri 2 exige **WebKitGTK 4.1** (não use instruções antigas de 4.0).

## Requisitos para RODAR (na máquina de teste)
- **DEB**: o `apt` resolve as dependências automaticamente (WebKitGTK/GTK etc.).
- **AppImage**: precisa do **WebKitGTK 4.1** instalado no sistema
  (`libwebkit2gtk-4.1-0`) e de **FUSE**. No Ubuntu 22.04+/derivados recentes,
  o FUSE 2 não vem por padrão:
  ```bash
  sudo apt install libfuse2
  ```
  Alternativa sem FUSE: `./Nokotuber_0.4.0_amd64.AppImage --appimage-extract-and-run`

## Instalação e execução

### AppImage (sem instalar)
```bash
chmod +x Nokotuber_0.4.0_amd64.AppImage
./Nokotuber_0.4.0_amd64.AppImage
```
O AppImage não exige instalação tradicional — é só dar permissão de execução e
rodar. Pode movê-lo para onde quiser (ex.: `~/Apps/`).

### DEB (Debian/Ubuntu/Mint/Pop!_OS)
```bash
sudo apt install ./Nokotuber_0.4.0_amd64.deb
```
O pacote declara as dependências `libwebkit2gtk-4.1-0` e `libgtk-3-0` (o `apt`
resolve automaticamente). O nome do pacote instalado é **`nokotuber`**
(confirmado no `control` do `.deb` gerado pelo CI), então para **remover**:
```bash
sudo apt remove nokotuber
```

### RPM (Fedora/openSUSE/RHEL-like) — se gerado
```bash
sudo dnf install ./Nokotuber-0.4.0-1.x86_64.rpm   # Fedora/RHEL
# ou
sudo zypper install ./Nokotuber-0.4.0-1.x86_64.rpm # openSUSE
```

## Microfone (PipeWire / PulseAudio)
O Nokotuber depende de microfone. A captura usa APIs Web padrão
(`navigator.mediaDevices.getUserMedia` / `enumerateDevices`) via WebKitGTK — não
há código específico de plataforma. No Linux, o áudio depende do ambiente da
distro (**PipeWire** ou **PulseAudio**). **O CI comprova compilação, não o
funcionamento do microfone** — isso só o teste real valida. Se o navegador
embutido não listar o microfone, verifique as permissões de áudio da sessão.

## Firewall / porta (Sala/Companion)
O servidor da Sala escuta em `0.0.0.0:8787` (porta configurável). Para um
Companion remoto conectar, a porta **`8787/TCP`** precisa estar acessível no
Host. O app **não** altera firewall automaticamente (nada de `ufw`/`iptables`/
`firewalld`) — libere manualmente se necessário. A conexão é agnóstica a VPN:
funciona por **LAN**, **VPN** ou qualquer **IP acessível** (`ws://IP_DO_HOST:8787`).

## Wayland x X11
Linux moderno roda em **Wayland** ou **X11**. Não forçamos nenhum dos dois.
Alguns comportamentos podem diferir entre as sessões — especialmente
**transparência**, **always-on-top**, **captura no OBS** e **tamanho/posição de
janela**. No teste, **registre qual sessão está em uso** (veja abaixo). Se um bug
aparecer só em uma sessão, documente antes de criar qualquer workaround.

## Troubleshooting
- **AppImage não abre / "dlopen ... libfuse.so.2"** → instale `libfuse2` ou use
  `--appimage-extract-and-run`.
- **AppImage: "cannot find webkit"** → instale `libwebkit2gtk-4.1-0`.
- **Tela preta/branca no avatar** → possível diferença de Canvas/WebGL no
  WebKitGTG; registre a sessão (Wayland/X11) e a distro.
- **Sem microfone na lista** → confira PipeWire/PulseAudio e as permissões de
  áudio da sessão do desktop.
- **Companion não conecta** → porta `8787/TCP` acessível? mesma rede/VPN? IP
  correto (não `localhost` em outra máquina)?

---

# Nokotuber — teste em Linux real (envie junto com o artifact)

## Sistema (preencha)
```text
Distribuição:
Versão:
Desktop (GNOME/KDE/…):
Sessão: Wayland / X11:
CPU:
Áudio: PipeWire / PulseAudio:
```

## Testes (marque)
```text
[ ] App abre.
[ ] Não ocorre crash.
[ ] Layout aparece corretamente.
[ ] Não existem barras/overflow inesperados.
[ ] Projeto abre.
[ ] Projeto salva.
[ ] Personagem salvo funciona.
[ ] Microfone aparece.
[ ] Permissão/captura de microfone funciona.
[ ] Avatar reage à fala.
[ ] Blink funciona.
[ ] Expressões funcionam.
[ ] Expressão de grito funciona.
[ ] Reações funcionam.
[ ] Visemas funcionam.
[ ] Add-ons funcionam.
[ ] Loja abre.
[ ] Login funciona.
[ ] Catálogo carrega.
[ ] Minha Biblioteca funciona.
[ ] Add-on marketplace é adicionado.
[ ] Modo Sala abre.
[ ] Até múltiplos participantes funcionam.
[ ] Companion conecta.
[ ] Speaking sincroniza.
[ ] Reações sincronizam.
[ ] Assets sincronizam.
[ ] Conexão permanece estável.
[ ] Modo Janela abre.
[ ] OBS consegue capturar.
[ ] Fechar/reabrir mantém configurações.
```

## Informe (para diagnóstico)
```text
Erro encontrado:
Sessão (Wayland/X11):
Print/log:
```

> Observação: a Loja precisa do **backend rodando** (localhost:8080 por padrão) e,
> entre máquinas diferentes, de uma VPN/LAN para o Companion — igual ao Windows.
