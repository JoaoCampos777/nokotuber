<script lang="ts">
  import type { EffectType } from "../../effects/effectTypes";
  import { EFFECT_LABELS, EFFECT_ICONS, EFFECT_DESCRIPTIONS } from "../../effects/effectPresets";

  export let onPick:  (type: EffectType) => void;
  export let onClose: () => void;

  const types: EffectType[] = ["darken", "jump", "randomMove", "waveMove", "waveRotate"];

  function handleBackdrop(e: MouseEvent) { if (e.target === e.currentTarget) onClose(); }
  function handleKey(e: KeyboardEvent)   { if (e.key === "Escape") onClose(); }
</script>

<svelte:window on:keydown={handleKey} />

<div class="backdrop" on:click={handleBackdrop} role="presentation">
  <div class="dialog" role="dialog">
    <div class="dialog-header">
      <span>Adicionar efeito</span>
      <button class="close" on:click={onClose}>×</button>
    </div>
    <div class="list">
      {#each types as type}
        <button class="effect-option" on:click={() => onPick(type)}>
          <span class="opt-icon">{EFFECT_ICONS[type]}</span>
          <div class="opt-text">
            <span class="opt-name">{EFFECT_LABELS[type]}</span>
            <span class="opt-desc">{EFFECT_DESCRIPTIONS[type]}</span>
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(15,10,10,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .dialog { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: var(--radius-lg); width: 380px; max-width: 90vw; box-shadow: 0 12px 40px rgba(0,0,0,0.5); overflow: hidden; }
  .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--color-border); font-size: 14px; font-weight: 600; }
  .close { background: none; border: none; color: var(--color-text-dim); font-size: 22px; cursor: pointer; line-height: 1; }
  .close:hover { color: var(--color-text-primary); }
  .list { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
  .effect-option { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--color-bg-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); cursor: pointer; text-align: left; font-family: inherit; transition: all 0.15s; }
  .effect-option:hover { border-color: var(--color-accent); background: var(--color-accent-soft); }
  .opt-icon { font-size: 22px; }
  .opt-text { display: flex; flex-direction: column; gap: 2px; }
  .opt-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
  .opt-desc { font-size: 11px; color: var(--color-text-dim); }
</style>