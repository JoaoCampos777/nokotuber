<script lang="ts">
  // Bloco "Começar": guia o próximo passo do fluxo da Sala, reusando os
  // mesmos handlers já existentes (não muda comportamento).
  import { companionRoom, createCompanionRoom, startCompanionServer } from "../../companion/companionStore";
  import { enterCompanionMode, openTutorial } from "../../companion/companionUi";

  $: r = $companionRoom;
  $: step = !r.enabled ? "create" : !r.serverRunning ? "start" : "companion";

  const labels: Record<string, string> = { create: "Criar sala", start: "Iniciar servidor local", companion: "Abrir Modo Companion" };
  const hints: Record<string, string> = {
    create: "Crie uma sala para outras pessoas entrarem como Companion e controlarem um avatar.",
    start: "Inicie o servidor local para aceitar conexões dos Companions.",
    companion: "Servidor rodando! Compartilhe o endereço abaixo ou entre você mesmo como Companion.",
  };

  function doStep() {
    if (step === "create") createCompanionRoom();
    else if (step === "start") startCompanionServer();
    else enterCompanionMode();
  }
</script>

<div class="qs">
  <div class="qs-head">
    <span class="qs-title">Começar</span>
    <button class="qs-help" on:click={openTutorial}>Como funciona?</button>
  </div>
  <p class="qs-hint">{hints[step]}</p>
  <button class="qs-cta" on:click={doStep}>{labels[step]}</button>
</div>

<style>
  .qs { box-sizing: border-box; width: 100%; min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid var(--color-accent-dim); border-radius: var(--radius-md); background: var(--color-accent-soft); }
  .qs-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .qs-title { font-size: 12px; font-weight: 700; color: var(--color-text-primary); }
  .qs-help { flex-shrink: 0; font-size: 10px; background: transparent; color: var(--color-accent); border: 1px solid var(--color-accent-dim); border-radius: 999px; padding: 2px 8px; cursor: pointer; font-family: inherit; }
  .qs-hint { margin: 0; font-size: 11px; line-height: 1.5; color: var(--color-text-secondary); }
  .qs-cta { width: 100%; padding: 9px; border: none; border-radius: var(--radius-sm); background: var(--color-accent); color: #fff; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; }
  .qs-cta:hover { background: var(--color-accent-hover); }
</style>
