# Changelog — Nokotuber

Todas as mudanças relevantes do Nokotuber são registradas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue (de forma aproximada) o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

**Categorias usadas:** `Adicionado`, `Alterado`, `Corrigido`, `Descontinuado`, `Removido`, `Segurança`.

> Como manter este arquivo: vá anotando as mudanças em **[Não lançado]** conforme desenvolve.
> Quando gerar um novo `pnpm tauri build`, recorte o conteúdo de **[Não lançado]** para uma
> nova seção de versão com a data. Há um modelo pronto no final do arquivo.

---

## [Não lançado]

### Adicionado
- _(anote aqui o que entrar antes do próximo build)_

### Alterado
-

### Corrigido
-

---

## [0.4.0] — 2026-08-16 — Personagens, Expressões, Loja e preparação macOS

### Adicionado
- **Personagens salvos** reutilizáveis entre projetos, com **carregamento
  automático** e opção de **personagem padrão** ao abrir o app.
- **Expressões personalizadas** por personagem e **expressão de grito** (troca de
  rosto quando você fala mais alto), com atalhos de teclado.
- **Modo Sala com até 10 participantes** (adicionar/remover, camadas).
- **Sistema de acessórios** sobre o personagem (posição, escala, rotação,
  opacidade, camada, espelho) — no Solo e por participante na Sala.
- **Loja Nokotuber**: catálogo de acessórios, itens gratuitos e premium, conta
  Nokotuber, **Minha Biblioteca** dos itens adquiridos e "Adicionar da Biblioteca".
- **Visemas / boca por vogais** (formatos de boca A/E/I/O/U, seleção manual) e
  modo **avatar base + boca separada**.
- **Preparação para macOS** (permissão de microfone, empacotamento) com validação
  de build por CI para **Apple Silicon** e **Intel**.
- **Build experimental para Linux (x86_64)** com validação por CI: pacotes
  **AppImage** e **Debian (.deb)** — e **RPM** experimental — disponíveis para
  testes. Ainda pendente de teste funcional em Linux real.
- **Tutorial/tour guiado** atualizado, incluindo recursos avançados e a Loja.

### Alterado
- **Novos acessórios agora vêm da Loja/Biblioteca** — a importação livre de PNG foi
  descontinuada para novos itens; acessórios locais antigos continuam funcionando.
- **Interface reorganizada** (blocos e seções recolhíveis, modos Simples/Avançado)
  e controles da Sala mais claros.
- Melhor **integração** entre personagens, expressões, efeitos e acessórios, e
  melhor **sincronização de assets** para o Companion.
- Textos de rede da Sala/Companion reescritos para linguagem **multiplataforma**
  (Radmin/Hamachi passam a ser citados como exemplo no Windows), sem mudança de
  protocolo — pensando em Linux e macOS.

### Corrigido
- Estabilidade da conexão Room/Companion e quedas **WebSocket 1006**.
- **Latência de fala** entre Host e Companion e sincronização de cena.
- **Download de acessórios da Loja** e o erro ao "Adicionar ao personagem".
- Responsividade e overflow da interface.
- Configuração de instalação do backend da Loja (projeto standalone).

### Segurança
- Pagamento processado apenas no provedor (checkout hospedado); segredos ficam só
  no backend; a posse de itens é validada no servidor, nunca no aplicativo.

---

## [0.1.0] — 2026-06-11 — Build de testes (Nokotuber Room Local/VPN)

Primeiro build compartilhado com amigos para testar a detecção de fala por participante.

### Adicionado
- **Nokotuber Room — modo Local/VPN.** O host cria uma sala e inicia um servidor
  WebSocket local; participantes em outra máquina conectam pela mesma rede ou via
  Radmin VPN / Hamachi. Funciona sem Discord, sem bot e sem servidor na nuvem.
- **Servidor local do host** escutando em `0.0.0.0:8787` (porta configurável), para
  aceitar conexões de outros PCs na rede/VPN.
- **Provider `remote_companion`.** Origem de fala remota que entra no mesmo fluxo das
  outras fontes: evento de fala → `participantAudioRouter` → vínculo por `externalUserId`
  → `setParticipantSpeaking` → avatar correto abre/fecha a boca.
- **Tela "Entrar como Companion"** com: nome, endereço do host, código da sala,
  seleção de microfone, medidor de volume e ajustes de sensibilidade
  (threshold), suavização e release (detecção de fala local via Web Audio).
- **Painel do host (Sala):** criar sala, iniciar/parar servidor, código da sala,
  porta, IP local detectado, campo para IP da VPN, endereço pronto para o Companion,
  copiar endereço, vincular participante remoto a uma Pessoa/avatar, desvincular,
  remover e status (conectado / falando / silencioso / desconectado).
- **Simulação de participantes** ("+ João" / "+ Mark") para testar o roteamento e os
  vínculos sem precisar de rede.
- **Tutorial guiado "Como usar o Nokotuber Room (Local/VPN)"**: abre na primeira vez,
  pelo botão "Como funciona?" e tem as opções "Entendi", "Não mostrar novamente"
  (salva no dispositivo) e "Copiar passo a passo".
- **Persistência da sala**: participantes e vínculos são salvos localmente
  (continuam ao reabrir o app) e também dentro do arquivo de projeto `.noko`.
- Mensagens de erro amigáveis no Companion (checklist de IP, porta, código da sala,
  mesma rede e firewall) e textos de ajuda próximos aos campos.

### Alterado
- A aba **Sala** passou a destacar o **Nokotuber Room** como caminho principal de
  detecção de fala por participante.

### Corrigido
- **Tela branca ao iniciar** causada por erro de carregamento de módulo no frontend.
- **App travando ("Não está respondendo")** em operações que aguardavam resposta de
  socket/HTTP — movidas para fora da thread principal.
- **Botões do painel da sala vazando** para fora da área; layout reorganizado para
  caber em qualquer largura.
- Layout e organização geral do painel do Companion/host.

### Descontinuado
- **Integração com Discord RPC** (detecção de fala por `rpc` / `rpc.voice.read`).
  O Discord informou que não libera esses escopos; a seção ficou marcada como
  **indisponível/experimental** e não é mais o caminho principal. O código
  permanece no projeto, apenas desativado.
- **Relay público (Render)** para conexões entre redes diferentes: **pausado** no MVP
  por adicionar complexidade (HTTPS/WSS, CSP, deploy, página pública). Pode voltar
  como opção futura.

### Mantido (sem alterações)
- Modo single-avatar e modo sala.
- Provider manual por participante.
- Microfone compartilhado (controla todos / só o selecionado / desativado).
- Usuários fake.
- Efeitos por participante.
- Salvar / Abrir / Exportar projeto (`.noko` / ZIP) e janela de performance (OBS).

### Limitações conhecidas
- Conexão entre redes diferentes exige **Radmin VPN ou Hamachi** (mesma rede virtual).
- O Companion **dentro do app** pode precisar liberar `ws://` no CSP do Tauri
  (`"csp": null` em dev ou `connect-src` com `ws://*`); pelo navegador isso não ocorre.
- O servidor local pode precisar de liberação no **Firewall do Windows** (rede privada).
- Sem reconexão automática, senha de sala ou remoção por inatividade ainda.

---

## Modelo para novas versões (copie e cole)

```markdown
## [X.Y.Z] — AAAA-MM-DD — Título curto do build

### Adicionado
-

### Alterado
-

### Corrigido
-

### Descontinuado
-

### Removido
-

### Segurança
-
```

### Guia rápido de versão
- **X (maior):** mudança grande que quebra compatibilidade de projetos `.noko` ou fluxo.
- **Y (menor):** novidade/recurso que não quebra nada existente.
- **Z (correção):** apenas correções e ajustes pequenos.
