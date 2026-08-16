import type { Tour } from "./tourStore";

// Passos com `target` destacam o elemento (data-tour="..."). Sem target = passo
// centralizado (explicação). Se o alvo não estiver visível, cai no centralizado.

export const TOUR_FIRST: Tour = {
  id: "first",
  name: "Primeiros passos",
  desc: "Uma visão geral do Nokotuber em poucos passos.",
  steps: [
    { title: "Bem-vindo ao Nokotuber! 🎉", body: "Vamos configurar seu avatar e sua sala em poucos passos. Use Próximo para avançar — ou Pular a qualquer momento." },
    { target: "mode-toggle", title: "Escolha o modo", body: "Solo controla um avatar com o seu microfone. Sala é para lives com outras pessoas, que entram como Companion." },
    { target: "avatar-images", title: "Configure o avatar", body: "Cada personagem tem imagens: boca fechada, boca aberta e as piscadas. Clique num quadro para importar." },
    { target: "mic-footer", title: "Configure o microfone", body: "Ligue o microfone e ajuste o Threshold para o avatar abrir a boca na hora certa." },
    { target: "simple-advanced", title: "Simples ou Avançado", body: "No modo Simples a tela fica enxuta. No Avançado aparecem efeitos e reação de voz por personagem." },
    { target: "perf-window", title: "Modo Janela (OBS)", body: "Abre uma janela só com o avatar, sem os painéis do editor — perfeita para capturar no OBS." },
    { title: "Pronto! ✅", body: "Você já sabe o básico. Reabra este tour quando quiser pelo botão Tutorial, no topo." },
  ],
};

export const TOUR_ROOM: Tour = {
  id: "room",
  name: "Como usar o Modo Sala",
  desc: "Crie uma sala e receba Companions.",
  steps: [
    { title: "Host e Companion", body: "O Host é quem cria a sala. O Companion é quem entra nela para controlar um avatar com o próprio microfone." },
    { target: "mode-toggle", title: "1. Ligue a Sala", body: "Ative o modo Sala aqui em cima. A aba Sala aparece com tudo que você precisa." },
    { target: "room-block", title: "2. Crie e inicie", body: "Em Começar: crie a sala e inicie o servidor local. O servidor aceita as conexões dos Companions." },
    { target: "room-address", title: "3. Envie o endereço", body: "Copie o endereço ws:// e mande para o amigo. Em casas diferentes, usem Radmin VPN ou Hamachi (não use localhost no outro PC)." },
    { target: "companions", title: "4. Vincule os participantes", body: "Quando alguém entrar como Companion, escolha qual Pessoa/avatar ele vai controlar." },
    { title: "Dica de firewall", body: "Na primeira vez, o Firewall do Windows pode pedir permissão — libere o Nokotuber na rede privada." },
    { target: "perf-window", title: "Modo Janela p/ OBS", body: "Host e Companion podem abrir o Modo Janela para capturar o avatar no OBS." },
  ],
};

export const TOUR_CHARACTER: Tour = {
  id: "character",
  name: "Como editar um personagem",
  desc: "Imagens, posição e voz de cada Pessoa.",
  steps: [
    { title: "Editar um personagem", body: "No Modo Sala, cada Pessoa é um personagem do palco. Vamos configurar." },
    { target: "participants", title: "1. Selecione a Pessoa", body: "Abra o bloco Participantes e clique numa Pessoa para expandir os controles dela." },
    { title: "2. Adicione imagens", body: "Importe boca fechada/aberta e as piscadas. Sem imagem, aparece um cartão de espaço reservado." },
    { title: "3. Ajuste no palco", body: "Use posição e escala para colocar o personagem. No modo Avançado há rotação, opacidade e espelhar." },
    { title: "4. Controle de voz", body: "Escolha como a Pessoa fala: Microfone do Host, Controle manual (teste) ou Companion (amigo remoto)." },
    { title: "5. Efeitos (avançado)", body: "No modo Avançado, cada Pessoa pode ter efeitos e uma reação de voz próprios. Use Testar fala/reação para conferir." },
  ],
};

export const TOUR_COMPANION: Tour = {
  id: "companion",
  name: "Como entrar como Companion",
  desc: "Para quem vai entrar na sala de um amigo.",
  steps: [
    { title: "Entrar como Companion", body: "O Companion controla um avatar na sala do Host usando o próprio microfone." },
    { title: "1. Abra o Modo Companion", body: "Na aba Sala, clique em Modo Companion (ou peça para o Host te enviar o endereço)." },
    { title: "2. Nome e endereço", body: "Digite seu nome e cole o endereço do Host (ws://IP:8787). Em casas diferentes, use o IP do Radmin/Hamachi." },
    { title: "3. Código e microfone", body: "Digite o código da sala e escolha seu microfone. Depois clique em Conectar." },
    { title: "4. Ajuste e teste", body: "Ajuste a sensibilidade e fale para testar. O Host vincula você a uma Pessoa/avatar." },
    { title: "5. Modo Janela", body: "Se você também for fazer live, abra o Modo Janela para capturar seu avatar no OBS." },
  ],
};

export const TOUR_ADVANCED: Tour = {
  id: "advanced",
  name: "Recursos avançados",
  desc: "Personagens salvos e outros recursos opcionais.",
  steps: [
    { title: "Recursos avançados", body: "Aqui ficam recursos opcionais. Você não precisa deles para começar — use quando quiser." },
    { target: "characters", title: "Meus Personagens", body: "Salve seu avatar como um personagem para reutilizá-lo em outras cenas, sem reconfigurar tudo. (Abra a aba Avatar para ver.)" },
    { target: "characters", title: "Personagem padrão", body: "Marque um personagem como padrão (★) para o Nokotuber já abrir com ele. Também dá pra reabrir o último usado." },
    { target: "addons", title: "Acessórios (add-ons)", body: "Adicione óculos, chapéus, coroas e overlays sobre o personagem — cada um com posição, escala e camada próprias. (Modo Avançado, aba Avatar.)" },
    { target: "simple-advanced", title: "Modo Avançado", body: "Ative o modo Avançado para ver efeitos, reação de voz, expressões e acessórios por personagem." },
  ],
};

export const ALL_TOURS: Tour[] = [TOUR_FIRST, TOUR_ROOM, TOUR_CHARACTER, TOUR_COMPANION, TOUR_ADVANCED];
