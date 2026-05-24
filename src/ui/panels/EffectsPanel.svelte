<script lang="ts">
  import { project, addEffect } from "../../project/projectStore";
  import { isAudioActive, simulateTalking } from "../../audio/audioStore";
  import { createEffect } from "../../effects/effectPresets";
  import type { EffectType } from "../../effects/effectTypes";
  import EffectCard from "../components/EffectCard.svelte";
  import AddEffectDialog from "../components/AddEffectDialog.svelte";

  let showAdd = false;

  function handlePick(type: EffectType) {
    addEffect(createEffect(type));
    showAdd = false;
  }
</script>

<div class="effects-panel">
  <div class="toolbar">
    <button class="add-btn" on:click={() => showAdd = true}>+ Adicionar efeito</button>
    <button
      class="sim-btn"
      on:click={() => simulateTalking()}
      disabled={$isAudioActive}
      title={$isAudioActive ? "Desligue o microfone para simular" : "Simula 2,5s de fala para testar os efeitos"}
    >▶ Testar fala</button>
  </div>

  <div class="list">
    {#if $project.effects.length === 0}
      <div class="empty">
        Nenhum efeito ainda.<br />
        Clique em <b>+ Adicionar efeito</b> para o avatar reagir quando você falar.
      </div>
    {:else}
      {#each $project.effects as fx (fx.id)}
        <EffectCard effect={fx} />
      {/each}
    {/if}
  </div>
</div>

{#if showAdd}
  <AddEffectDialog onPick={handlePick} onClose={() => showAdd = false} />
{/if}

<style>
  .effects-panel { display: flex; flex-direction: column; }
  .toolbar { display: flex; flex-direction: column; gap: 5px; padding: 8px 10px; border-bottom: 1px solid var(--color-border-soft); }
  .add-btn { background: var(--color-accent); color: white; border: none; padding: 7px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .add-btn:hover { background: var(--color-accent-hover); }
  .sim-btn { background: var(--color-bg-hover); color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); padding: 6px; border-radius: var(--radius-sm); font-size: 12px; cursor: pointer; font-family: inherit; }
  .sim-btn:hover:not(:disabled) { background: var(--color-accent-soft); color: var(--color-text-primary); }
  .sim-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .list { display: flex; flex-direction: column; gap: 5px; padding: 8px; }
  .empty { padding: 16px 12px; font-size: 11px; color: var(--color-text-dim); text-align: center; line-height: 1.6; }
</style>