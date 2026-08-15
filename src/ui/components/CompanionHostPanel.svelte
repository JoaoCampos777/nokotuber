<script lang="ts">
  import { room } from "../../room/roomStore";
  import {
    companionRoom, createCompanionRoom, endCompanionRoom,
    addRemoteParticipant, removeRemoteParticipant, setRemoteParticipantSpeaking,
    bindRemoteToParticipant, unbindRemote,
    startCompanionServer, stopCompanionServer, setHostPort, setVpnIp,
  } from "../../companion/companionStore";
  import { enterCompanionMode, openTutorial, tutorialDismissed } from "../../companion/companionUi";
  import { broadcastRoomSnapshot } from "../../companion/companionHostSync";

  let port = $companionRoom.hostPort || 8787;
  let vpn = $companionRoom.vpnIp || "";
  $: ipShown = vpn || $companionRoom.localIp || "IP_DO_HOST";
  $: connectAddr = `ws://${ipShown}:${$companionRoom.hostPort}`;

  function onBindChange(remoteId: string, e: Event) { const v = (e.target as HTMLSelectElement).value; if (v) bindRemoteToParticipant(remoteId, v); else unbindRemote(remoteId); }
  function copyAddr() { navigator.clipboard?.writeText(connectAddr).catch(() => {}); }
  function createRoom() { createCompanionRoom(); if (!tutorialDismissed()) openTutorial(); }
  function confirmEnd() { if (window.confirm("Encerrar a sala? Isso desconecta todos os Companions e para o servidor.")) endCompanionRoom(); }
</script>

<div class="ck">
  <div class="ck-head">
    <span class="ck-title">Nokotuber Room — Local/VPN</span>
    <button class="ck-help" on:click={openTutorial}>Como funciona?</button>
  </div>

  {#if !$companionRoom.enabled}
    <p class="ck-note">Cada pessoa usa o próprio microfone para controlar seu avatar. Funciona na mesma rede — ou entre casas diferentes via Radmin VPN/Hamachi.</p>
    <button class="chip accent full" on:click={createRoom}>Criar sala</button>
  {:else}
    <div class="ck-room">
      <div><b>Código:</b> <code>{$companionRoom.roomId}</code></div>
      <label class="ck-mini">Porta
        <input type="number" class="ck-in sm" bind:value={port} on:input={() => setHostPort(Number(port) || 8787)} />
      </label>
      <div><b>IP local detectado:</b> <code>{$companionRoom.localIp ?? "—"}</code></div>
      <label class="ck-mini">IP da VPN (Radmin/Hamachi), se usar
        <input class="ck-in" placeholder="Ex: 26.123.45.67" bind:value={vpn} on:input={() => setVpnIp(vpn)} />
      </label>
      <div data-tour="room-address"><b>Endereço p/ o Companion:</b> <code>{connectAddr}</code></div>
      <p class="ck-help-text">⚠ Este endereço <b>não abre no navegador</b>. Ele vai no campo "Endereço do Host" dentro do modo Companion. Envie-o para quem vai entrar; em casas diferentes, use o IP do Radmin/Hamachi.</p>
    </div>

    {#if $companionRoom.serverRunning}
      <button class="chip full" on:click={stopCompanionServer}>Parar servidor</button>
    {:else}
      <button class="chip full accent" on:click={startCompanionServer}>Iniciar servidor local</button>
    {/if}
    <div class="ck-row">
      <button class="chip grow" on:click={copyAddr}>Copiar endereço</button>
      <button class="chip grow" on:click={enterCompanionMode}>Modo Companion</button>
    </div>
    <button class="chip full" on:click={() => broadcastRoomSnapshot(true)}>Atualizar cena nos Companions</button>
    <button class="chip full danger" on:click={confirmEnd}>Encerrar sala</button>

    <div class="ck-sim" data-tour="companions">
      <span class="ck-sub">Teste (simular):</span>
      <div class="ck-row">
        <button class="chip grow" on:click={() => addRemoteParticipant("remote_joao", "João (remoto)")}>+ João</button>
        <button class="chip grow" on:click={() => addRemoteParticipant("remote_mark", "Mark (remoto)")}>+ Mark</button>
      </div>
    </div>

    {#if $companionRoom.participants.length === 0}
      <p class="ck-note">Nenhum participante. Inicie o servidor e peça pro Companion conectar (ou use a simulação).</p>
    {:else}
      <div class="ck-list">
        {#each $companionRoom.participants as p (p.id)}
          <div class="ck-item">
            <div class="ck-item-top">
              <span class="ck-name">{p.displayName}</span>
              <span class="ck-dot {p.isSpeaking ? 'on' : ''}">{p.connected ? (p.isSpeaking ? "● falando" : "○ silencioso") : "⚠ desconectado"}</span>
            </div>
            <select class="ck-in" on:change={(e) => onBindChange(p.id, e)}>
              <option value="">— não vinculado</option>
              {#each $room.participants as rp (rp.id)}<option value={rp.id} selected={p.boundParticipantId === rp.id}>{rp.name}</option>{/each}
            </select>
            <div class="ck-item-btns">
              <button class="chip grow" class:on={p.isSpeaking} on:click={() => setRemoteParticipantSpeaking(p.id, !p.isSpeaking)}>Falar</button>
              <button class="chip grow" on:click={() => removeRemoteParticipant(p.id)}>Remover</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .ck { box-sizing: border-box; width: 100%; display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); }
  .ck * { box-sizing: border-box; }
  .ck-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .ck-title { font-size: 11px; font-weight: 700; color: var(--color-text-secondary); }
  .ck-help { font-size: 10px; background: transparent; color: var(--color-accent); border: 1px solid var(--color-accent-dim, var(--color-border-soft)); border-radius: 999px; padding: 2px 8px; cursor: pointer; }
  .ck-note { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }
  .ck-room { font-size: 11px; color: var(--color-text-secondary); line-height: 1.6; display: flex; flex-direction: column; gap: 4px; }
  .ck-room code { background: var(--color-bg-panel-2); padding: 1px 4px; border-radius: 3px; word-break: break-all; }
  .ck-mini { display: flex; flex-direction: column; gap: 2px; font-size: 10px; color: var(--color-text-dim); }
  .ck-help-text { font-size: 10px; color: var(--color-text-dim); margin: 2px 0 0; line-height: 1.4; }
  .ck-sim { border-top: 1px solid var(--color-border-soft); padding-top: 6px; display: flex; flex-direction: column; gap: 4px; }
  .ck-sub { font-size: 10px; font-weight: 700; color: var(--color-accent); }
  .ck-list { display: flex; flex-direction: column; gap: 5px; }
  .ck-item { border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 7px; display: flex; flex-direction: column; gap: 5px; background: var(--color-bg-panel-2); }
  .ck-item-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .ck-name { font-size: 11px; font-weight: 600; color: var(--color-text-primary); }
  .ck-dot { font-size: 10px; color: var(--color-text-dim); white-space: nowrap; } .ck-dot.on { color: var(--color-success); }
  .ck-row { display: flex; gap: 4px; } .ck-item-btns { display: flex; gap: 4px; }
  .ck-in { width: 100%; background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 6px; font-size: 11px; font-family: inherit; }
  .ck-in.sm { width: 90px; }
  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .chip.grow { flex: 1; min-width: 0; text-align: center; } .chip.full { width: 100%; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip.accent { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
  .chip.danger { color: var(--color-danger); border-color: var(--color-danger); background: transparent; }
  .chip.danger:hover { background: var(--color-danger); color: #fff; }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }
</style>