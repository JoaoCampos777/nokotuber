<script lang="ts">
  import { onDestroy } from "svelte";
  import { companionClient, companionLog, vadSettings, listMics, connectCompanion, disconnectCompanion, sendTestHello } from "../companion/companionClient";
  import { exitCompanionMode, openTutorial, companionMode } from "../companion/companionUi";

  const params = new URLSearchParams(location.search);
  let name = "";
  let hostUrl = params.get("host") || "ws://localhost:8787";
  let roomCode = (params.get("room") || "").toUpperCase();
  let deviceId = "";
  let mics: MediaDeviceInfo[] = [];

  async function refreshMics() { mics = await listMics(); if (!deviceId && mics[0]) deviceId = mics[0].deviceId; }
  async function connect() { await connectCompanion(name.trim() || "Participante", hostUrl.trim(), roomCode.trim().toUpperCase(), deviceId); }
  onDestroy(() => disconnectCompanion());
</script>

<div class="cc">
  <div class="top">
    {#if $companionMode}<button class="link" on:click={() => { disconnectCompanion(); exitCompanionMode(); }}>← Voltar ao editor</button>{/if}
    <button class="link" on:click={openTutorial}>Como funciona?</button>
  </div>
  <h1>Nokotuber Companion</h1>
  <p class="sub">Controle seu avatar com seu microfone — na mesma rede ou via Radmin/Hamachi.</p>

  <label>Seu nome<input bind:value={name} placeholder="Ex: Mark" /></label>
  <label>Endereço do Host<input bind:value={hostUrl} placeholder="Ex: ws://26.xxx.xxx.xxx:8787" /></label>
  <p class="hint">Use o IP do Host no Radmin/Hamachi. <b>Não use localhost</b> se você estiver em outro PC.</p>
  <label>Código da sala<input bind:value={roomCode} placeholder="Ex: RGXLZL" /></label>
  <label>Microfone
    <div class="row">
      <select bind:value={deviceId}>{#each mics as m}<option value={m.deviceId}>{m.label || "Microfone"}</option>{/each}</select>
      <button class="btn" on:click={refreshMics}>Atualizar</button>
    </div>
  </label>

  <div class="vad">
    <label>Sensibilidade: {$vadSettings.threshold}<input type="range" min="0" max="60" bind:value={$vadSettings.threshold} /></label>
    <label>Suavização: {$vadSettings.smoothing.toFixed(2)}<input type="range" min="0" max="0.95" step="0.05" bind:value={$vadSettings.smoothing} /></label>
    <label>Release (ms): {$vadSettings.releaseMs}<input type="range" min="0" max="800" step="50" bind:value={$vadSettings.releaseMs} /></label>
  </div>

  <div class="meter"><div class="fill" style="width:{$companionClient.volume}%"></div></div>
  <div class="status">
    <span class="dot {$companionClient.isSpeaking ? 'on' : ''}">{$companionClient.isSpeaking ? "● Falando" : "○ Silencioso"}</span>
    <span class="conn">{$companionClient.status}</span>
  </div>
  {#if $companionClient.error}<pre class="err">{$companionClient.error}</pre>{/if}

  {#if $companionClient.status === "connected"}
    <button class="btn danger big" on:click={disconnectCompanion}>Desconectar</button>
  {:else}
    <button class="btn accent big" on:click={connect}>Conectar</button>
  {/if}
  <p class="hint">Acompanhe abaixo para ver os logs detalhados da conexão.</p>{#if $companionClient.status === "connected"}
    <button class="btn danger big" on:click={disconnectCompanion}>Desconectar</button>
  {:else}
   <!-- <button class="btn accent big" on:click={connect}>Conectar</button>-->
  {/if}

  <details class="logbox" open>
    <summary>Log de conexão</summary>
    <pre>{$companionLog.length ? $companionLog.join("\n") : "Clique em Conectar para começar…"}</pre>
  </details>

</div>

<style>
:global(html), :global(body) { margin: 0; background: #1c1818; }

.logbox { border: 1px solid #3a3536; border-radius: 6px; background: #141111; }
  .logbox summary { cursor: pointer; padding: 6px 10px; font-size: 12px; color: #9a8f8c; }
  .logbox pre { margin: 0; padding: 8px 10px; max-height: 200px; overflow: auto; font-size: 10px; line-height: 1.45; color: #cbbfbb; white-space: pre-wrap; word-break: break-all; }
  .cc { max-width: 440px; margin: 0 auto; padding: 20px 18px; display: flex; flex-direction: column; gap: 10px; color: #f4ebe8; font-family: system-ui, sans-serif; background: #1c1818; min-height: 100vh; }
  .top { display: flex; justify-content: space-between; }
  .link { background: transparent; border: none; color: #e8a94a; cursor: pointer; font-size: 12px; font-family: inherit; }
  h1 { font-size: 18px; margin: 0; } .sub { font-size: 12px; color: #9a8f8c; margin: 0 0 4px; }
  label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #cbbfbb; }
  input, select { background: #27282c; color: inherit; border: 1px solid #3a3536; border-radius: 6px; padding: 7px 9px; font-size: 13px; font-family: inherit; box-sizing: border-box; }
  .hint { font-size: 11px; color: #9a8f8c; margin: 0; }
  .row { display: flex; gap: 6px; } .row select { flex: 1; }
  .vad { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #3a3536; padding-top: 10px; }
  .vad input[type=range] { width: 100%; }
  .meter { height: 10px; background: #27282c; border-radius: 6px; overflow: hidden; }
  .fill { height: 100%; background: #4caf82; transition: width 60ms linear; }
  .status { display: flex; justify-content: space-between; font-size: 12px; }
  .dot { color: #9a8f8c; } .dot.on { color: #4caf82; font-weight: 700; } .conn { color: #9a8f8c; }
  .err { color: #e8a94a; font-size: 12px; margin: 0; white-space: pre-wrap; font-family: inherit; background: #2a2020; border: 1px solid #5a3a3a; border-radius: 6px; padding: 8px 10px; }
  .btn { padding: 8px 10px; border-radius: 8px; border: 1px solid #3a3536; background: transparent; color: inherit; cursor: pointer; font-size: 13px; font-family: inherit; }
  .btn.big { width: 100%; padding: 11px; font-size: 14px; }
  .btn.accent { background: #a21837; border-color: #a21837; color: #fff; } .btn.danger { border-color: #e8a94a; color: #e8a94a; }
</style>