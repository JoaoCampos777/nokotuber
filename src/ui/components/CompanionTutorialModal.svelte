<script lang="ts">
  import { tutorialOpen, closeTutorial, dismissTutorialForever } from "../../companion/companionUi";
  const plain =
`Como usar o Nokotuber Room (Local/VPN)

O Nokotuber Room deixa outra pessoa controlar um avatar da sua sala usando o microfone dela. O Discord continua só para conversar; o Nokotuber usa uma conexão separada só para saber quem está falando.

Para funcionar, todos precisam estar na mesma rede. Em casas diferentes, usem Radmin VPN ou Hamachi para criar uma rede virtual.

HOST:
1. Abra o Nokotuber e vá em Sala.
2. Clique em Criar sala e depois Iniciar servidor local.
3. O app mostra código, porta e endereço.
4. Se usar Radmin/Hamachi, mande o IP virtual mostrado lá. Ex: ws://26.xxx.xxx.xxx:8787

COMPANION:
1. Entre na mesma rede do Host (Radmin/Hamachi).
2. Abra o modo Companion.
3. Nome, endereço do Host, código da sala, microfone.
4. Conectar e falar para testar.

Depois: o Host vê seu nome, vincula você a uma Pessoa/avatar, e só o seu avatar reage quando você fala.

Atenção:
- Não use localhost em outro PC; use o IP do Radmin/Hamachi.
- O Host inicia a sala antes do Companion conectar.
- Se não conectar, libere o Nokotuber no Firewall (rede privada).
- Confira mesma rede, mesmo código e porta correta.`;
  function copySteps() { navigator.clipboard?.writeText(plain).catch(() => {}); }
</script>

{#if $tutorialOpen}
  <div class="ov" role="presentation" on:click|self={closeTutorial}>
    <div class="modal">
      <h2>Como usar o Nokotuber Room (Local/VPN)</h2>
      <div class="body">
        <p>Deixa outra pessoa controlar um avatar da sua sala usando o <b>microfone dela</b>. O Discord continua só para conversar; o Nokotuber usa uma conexão separada só para saber quem fala.</p>
        <p>Todos precisam estar na <b>mesma rede</b>. Em casas diferentes, usem <b>Radmin VPN</b> ou <b>Hamachi</b> para criar uma rede virtual.</p>
        <h3>Para o Host</h3>
        <ol>
          <li>Vá em <b>Sala</b> → <b>Criar sala</b> → <b>Iniciar servidor local</b>.</li>
          <li>O app mostra o código, a porta e o endereço.</li>
          <li>Usando Radmin/Hamachi, envie o <b>IP virtual</b> de lá. Ex: <code>ws://26.xxx.xxx.xxx:8787</code></li>
        </ol>
        <h3>Para o Companion</h3>
        <ol>
          <li>Entre na mesma rede do Host (Radmin/Hamachi).</li>
          <li>Abra o modo Companion, digite nome, endereço do Host, código e escolha o microfone.</li>
          <li>Clique em <b>Conectar</b> e fale para testar.</li>
        </ol>
        <p>Depois, o Host vincula você a uma Pessoa/avatar — e só o seu avatar reage quando você fala.</p>
        <h3>Se não conectar</h3>
        <ul>
          <li>Não use <b>localhost</b> em outro PC — use o IP do Radmin/Hamachi.</li>
          <li>O Host precisa <b>iniciar a sala antes</b>.</li>
          <li>Libere o Nokotuber no <b>Firewall do Windows</b> (rede privada).</li>
          <li>Confira: mesma rede, mesmo código, porta correta.</li>
        </ul>
      </div>
      <div class="actions">
        <button class="b" on:click={copySteps}>Copiar passo a passo</button>
        <button class="b" on:click={dismissTutorialForever}>Não mostrar novamente</button>
        <button class="b accent" on:click={closeTutorial}>Entendi</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .ov { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
  .modal { background: #261f1f; color: #f4ebe8; border: 1px solid #3a3536; border-radius: 12px; max-width: 540px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; font-family: system-ui, sans-serif; }
  h2 { margin: 0; padding: 16px 18px; border-bottom: 1px solid #3a3536; font-size: 16px; }
  .body { padding: 14px 18px; overflow-y: auto; font-size: 13px; line-height: 1.55; }
  .body h3 { font-size: 13px; margin: 14px 0 4px; color: #e8a94a; }
  .body p { margin: 6px 0; } .body ol, .body ul { margin: 4px 0; padding-left: 20px; }
  .body code { background: #1c1818; padding: 1px 5px; border-radius: 4px; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; padding: 12px 18px; border-top: 1px solid #3a3536; }
  .b { padding: 8px 12px; border-radius: 7px; border: 1px solid #3a3536; background: transparent; color: inherit; cursor: pointer; font-size: 12px; font-family: inherit; }
  .b.accent { background: #a21837; border-color: #a21837; color: #fff; }
</style>