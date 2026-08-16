# Nokotuber — Boca por Visemas (Fase 5/6)

## O que está implementado (estrutura manual)
- Modo de boca **opcional** por avatar: `simple` (fechada/aberta, **padrão**) ou `visemes`.
- Conjunto compacto: **REST / A / E / I / O / U**.
- Dois tipos no modo visemas:
  - **Avatar completo** (`full`): cada viseme é a imagem inteira do personagem.
  - **Base + boca separada** (`separated`): as imagens de viseme são só a boca,
    desenhada como camada sobre o avatar base (reaproveita o sistema de camadas
    dos add-ons), com posição/escala/rotação próprias.
- **Seletor manual + preview**: você escolhe o viseme atual e o palco atualiza na
  hora, para validar as imagens.
- Persistência: personagem salvo (`.nokochar`), projeto (`.noko`), Sala
  (`nokotuber:room:v1`), sincronização ao **Companion** (protocolo de assets) e à
  **Janela** (Modo Performance). Compatível com projetos antigos (default `simple`).

Arquivos: `src/mouth/mouthTypes.ts`, `src/ui/components/MouthControls.svelte`,
render em `Renderer2D.ts` / `RoomRenderer2D.ts` / `displayImage.ts`.

## Reconhecimento automático de vogal — EXPERIMENTAL / FUTURO (não entregue)
**Por que não está automático nesta rodada:** o pipeline de microfone atual mede
apenas **amplitude/volume** (FFT → média). **Volume não identifica fonema** — falar
"A" alto e "O" alto dão o mesmo volume. Portanto não dá para inferir a vogal a partir
do que temos hoje sem inventar uma heurística falsa (o que o projeto pediu para NÃO
fazer).

### Opções reais avaliadas (para uma fase futura)
| Abordagem | Latência | Precisão A/E/I/O/U | Custo/Deps | Offline | Nota |
|---|---|---|---|---|---|
| Formantes (F1/F2 via LPC/autocorrelação) | Baixa | Média | Baixo (DSP próprio) | Sim | Caminho mais promissor p/ vogais em realtime; sensível a ruído/mic |
| Vosk (modelo pequeno) | Média | Alta (palavras) | Médio (modelo ~50MB) | Sim | Bom p/ fala, pesado p/ viseme por frame |
| Whisper | Alta | Alta | Alto | Sim/parcial | Não é realtime frame-a-frame |
| Rhubarb Lip Sync | — | Boa (offline) | Médio | Sim | Feito p/ arquivos gravados, não streaming ao vivo |
| Modelo WASM leve dedicado | Baixa/Média | ? | Médio | Sim | Precisa achar/treino; validar licença |

### Recomendação para a próxima fase
Prototipar **análise de formantes (F1/F2)** local em Rust/WASM ou no AudioWorklet,
medindo CPU e latência antes de ligar por padrão. Enquanto isso, o modo manual
(hotkeys/seletor) já é utilizável e correto. Nada de "reconhecimento" por volume.
