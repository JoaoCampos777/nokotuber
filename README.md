# Nokotuber

Um aplicativo de **PNGTuber** para desktop: seu avatar em PNG reage ao seu
microfone — a boca abre e fecha quando você fala, os olhos piscam, expressões
trocam quando você grita. Feito para streamers e criadores que querem aparecer
sem ligar a câmera.

> **PNGTuber?** É a versão simples de um VTuber: em vez de um modelo 3D com
> rastreamento facial, você usa algumas imagens PNG (boca fechada, boca aberta,
> olhos fechados…) e o app troca entre elas conforme sua voz. Sem webcam, sem
> rig, sem hardware especial — só um microfone.

<!--
  📸 ESPAÇO PARA MÍDIA — este é um projeto visual e merece uma demonstração.
  Grave 3–5 s do avatar falando (ScreenToGif no Windows, Kap no macOS,
  Peek no Linux), salve em `docs/demo.gif` e troque o comentário abaixo por:

  ![Nokotuber em ação](docs/demo.gif)

  Sugestões do que mostrar: a boca sincronizando com a fala, a piscada,
  uma expressão de grito e o Modo Janela capturado no OBS.
-->

## O que ele faz

- **Avatar reativo à voz** — boca sincronizada com o microfone, piscada
  automática, limiar de fala ajustável.
- **Personagens salvos** — monte um personagem e reutilize entre projetos, com
  personagem padrão carregado ao abrir o app.
- **Expressões** nomeadas com atalhos de teclado, incluindo **expressão de
  grito** (troca o rosto quando você fala mais alto).
- **Visemas** — formatos de boca por vogal (A/E/I/O/U), com modo avatar base +
  boca separada.
- **Acessórios (add-ons)** sobrepostos ao personagem: posição, escala, rotação,
  opacidade, camada e espelho.
- **Modo Sala** com até **10 participantes** no mesmo palco.
- **Nokotuber Room (Companion)** — seus amigos controlam os próprios avatares
  pelo microfone deles, por LAN ou VPN, via WebSocket local. Sem servidor na
  nuvem, sem bot.
- **Modo Janela** — uma janela dedicada, limpa, pronta para capturar no **OBS**.
- **Efeitos e reações de voz** aplicados dentro do canvas (preserva chroma key).

## Requisitos

| Ferramenta | Versão |
|---|---|
| [Node.js](https://nodejs.org) | 20+ (desenvolvido com **24 LTS**) |
| [pnpm](https://pnpm.io) | 9+ |
| [Rust](https://rustup.rs) (stable) | 1.77+ |
| Tauri | 2.x (via dependências do projeto) |

Dependências de sistema por plataforma (WebView2, Xcode CLT, WebKitGTK) seguem
os [pré-requisitos do Tauri 2](https://v2.tauri.app/start/prerequisites/).
No Linux, veja também [`BUILD_LINUX.md`](BUILD_LINUX.md).

## Rodando em desenvolvimento

```bash
pnpm install
pnpm tauri dev
```

`pnpm dev` sozinho sobe só o frontend no navegador (Vite, porta 1420) — útil
para mexer na interface, mas os recursos nativos (diálogos de arquivo, servidor
da Sala, janelas extras) só funcionam dentro do `tauri dev`.

## Build

```bash
pnpm tauri:build
```

> **Loja e CSP.** O endereço da Store API entra na Content-Security-Policy do
> aplicativo empacotado. Use **`pnpm tauri:build`** (e não `pnpm tauri build`):
> ele roda `pnpm csp:config` antes, gerando a CSP a partir de
> `VITE_STORE_API_URL` e `NOKOTUBER_CSP_EXTRA_ORIGINS` (ver `.env.example`).
> Sem isso o instalador permite apenas `http://localhost:8080` e a Loja é
> bloqueada pela webview — falha que **não** aparece em `tauri dev`.

Os instaladores saem em `src-tauri/target/release/bundle/`:

| Plataforma | Formatos |
|---|---|
| Windows | `.msi`, `.exe` (NSIS) |
| macOS | `.app`, `.dmg` — veja [`BUILD_MACOS.md`](BUILD_MACOS.md) |
| Linux | `.AppImage`, `.deb`, `.rpm` — veja [`BUILD_LINUX.md`](BUILD_LINUX.md) |

Há workflows de CI em `.github/workflows/` que compilam macOS (Apple Silicon +
Intel) e Linux (x86_64) e publicam os pacotes como *artifacts*.

## Status

**Versão atual: v0.4.0.**

| Plataforma | Situação |
|---|---|
| Windows | ✅ usado e testado |
| macOS | 🟡 build validado em CI (Apple Silicon + Intel); teste funcional em Mac real pendente |
| Linux | 🟡 build validado em CI (x86_64: AppImage/DEB/RPM); teste funcional pendente |

Ainda em desenvolvimento — espere arestas. O histórico de mudanças está em
[`CHANGELOG.md`](CHANGELOG.md).

## Stack

Svelte 4 + TypeScript + Vite no frontend (renderização em **Canvas 2D**),
Tauri 2 + Rust no shell nativo. O servidor da Sala usa `std::net` +
`tungstenite`. **Não usa SvelteKit** — o `svelte.config.js` existe apenas para
o `vitePreprocess`.

## A Loja de acessórios

O app tem uma Loja de acessórios embutida. O **serviço** por trás dela — a API
de catálogo, contas, pagamento e downloads, e o painel administrativo — é
**closed-source** e vive num repositório privado separado. O que está aqui é o
cliente: `src/store/storeClient.ts` fala com essa API por HTTP.

O aplicativo funciona por completo sem a Loja. Se ela estiver fora do ar ou você
não configurar `VITE_STORE_API_URL`, o app avisa e todo o resto continua
funcionando — você pode importar seus próprios PNGs como acessórios de graça,
sem conta.

O código do app é MIT. A Loja não faz parte dessa licença.

## Documentação

- [`CHANGELOG.md`](CHANGELOG.md) — o que mudou em cada versão
- [`BUILD_MACOS.md`](BUILD_MACOS.md) — build e teste no macOS
- [`BUILD_LINUX.md`](BUILD_LINUX.md) — build, formatos e teste no Linux
- [`VISEMES.md`](VISEMES.md) — como os visemas funcionam e por que o
  reconhecimento automático de vogais **não** foi implementado

## Licença

[MIT](LICENSE) © João Gabriel Campos
