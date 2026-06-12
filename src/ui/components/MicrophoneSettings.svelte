<script lang="ts">
  import SelectControl from "./SelectControl.svelte";
  import {
    audioLevel, isTalking, isAudioActive, startAudioCapture, stopAudioCapture,
    restartAudioCapture, audioDevices, selectedDeviceId, audioError,
    refreshAudioDevices, setAudioDevice,
  } from "../../audio/audioStore";

  let refreshing = false;

  async function handleRefresh() {
    refreshing = true;
    try { await refreshAudioDevices(); } finally { refreshing = false; }
  }

  function onDevice(id: string) {
    setAudioDevice(id);
    restartAudioCapture(); // se o mic estiver ligado, troca na hora
  }

  async function toggleMic() {
    if ($isAudioActive) stopAudioCapture();
    else await startAudioCapture();
  }

  $: deviceOptions = $audioDevices.map((d) => ({ value: d.id, label: d.name }));
</script>

<div class="mic">
  <SelectControl label="Microfone" value={$selectedDeviceId} options={deviceOptions} onChange={onDevice} />

  <div class="mic-actions">
    <button class="mic-btn" on:click={handleRefresh} disabled={refreshing}>
      {refreshing ? "Atualizando…" : "↻ Atualizar dispositivos"}
    </button>
    <button class="mic-btn" class:on={$isAudioActive} on:click={toggleMic}>
      {$isAudioActive ? "■ Parar" : "● Ligar"}
    </button>
  </div>

  <div class="meter">
    <div class="meter-fill" class:talking={$isTalking} style="width:{$audioLevel}%"></div>
  </div>

  {#if $audioError}
    <div class="mic-error">⚠ {$audioError}</div>
  {:else if $isAudioActive}
    <div class="mic-hint">Fale agora para testar a sensibilidade.</div>
  {:else}
    <div class="mic-hint">Clique em "Atualizar dispositivos" para listar seus microfones.</div>
  {/if}
</div>

<style>
  .mic { display: flex; flex-direction: column; gap: 6px; }
  .mic-actions { display: flex; gap: 5px; }
  .mic-btn {
    flex: 1; background: var(--color-bg-panel-2); color: var(--color-text-secondary);
    border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm);
    padding: 6px 8px; font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap;
  }
  .mic-btn:hover:not(:disabled) { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .mic-btn:disabled { opacity: .5; cursor: not-allowed; }
  .mic-btn.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }

  .meter { height: 8px; background: var(--color-bg-hover); border-radius: 4px; overflow: hidden; }
  .meter-fill { height: 100%; background: var(--color-success); transition: width .05s, background .1s; }
  .meter-fill.talking { background: var(--color-accent); }

  .mic-error { font-size: 10px; color: var(--color-danger); background: var(--color-accent-soft); border-radius: var(--radius-sm); padding: 6px 8px; line-height: 1.4; }
  .mic-hint  { font-size: 10px; color: var(--color-text-dim); line-height: 1.4; }
</style>