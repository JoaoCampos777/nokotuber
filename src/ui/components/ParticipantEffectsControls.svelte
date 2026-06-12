<script lang="ts">
  import SliderControl from "./SliderControl.svelte";
  import SelectControl from "./SelectControl.svelte";
  import {
    participantEffects, setParticipantEffectsEnabled, setPresetEnabled,
    updatePreset, copyEffectsTo, resetParticipantEffects,
  } from "../../effects/participantEffectsStore";
  import { PARTICIPANT_EFFECT_KEYS, PARTICIPANT_EFFECT_LABELS } from "../../effects/participantEffects";

  export let participantId: string;
  export let others: { value: string; label: string }[] = [];

  $: fx = $participantEffects.find((e) => e.participantId === participantId);

  let copyTarget = "";
  function doCopy(v: string) {
    copyTarget = "";
    if (v) copyEffectsTo(participantId, v);
  }
</script>

{#if fx}
  <div class="pe">
    <div class="pe-top">
      <button class="chip" class:on={fx.enabled}
        on:click={() => setParticipantEffectsEnabled(participantId, !fx.enabled)}>
        {fx.enabled ? "● Efeitos ativos" : "○ Efeitos off"}
      </button>
      <button class="chip" on:click={() => resetParticipantEffects(participantId)}>↺ Resetar</button>
    </div>

    <div class="pe-list" class:dim={!fx.enabled}>
      {#each PARTICIPANT_EFFECT_KEYS as key}
        {@const pr = fx.presets[key]}
        <div class="pe-fx">
          <button class="chip wide" class:on={pr.enabled}
            on:click={() => setPresetEnabled(participantId, key, !pr.enabled)}>
            {pr.enabled ? "☑" : "☐"} {PARTICIPANT_EFFECT_LABELS[key]}
          </button>
          {#if pr.enabled}
            <SliderControl label="Intensidade" value={pr.intensity} min={0} max={10} step={0.5}
              onChange={(v) => updatePreset(participantId, key, { intensity: v })} />
            <SliderControl label="Velocidade" suffix="x" value={pr.speed} min={0.1} max={3} step={0.05}
              onChange={(v) => updatePreset(participantId, key, { speed: v })} />
          {/if}
        </div>
      {/each}
    </div>

    {#if others.length}
      <SelectControl label="Copiar efeitos para" value={copyTarget}
        options={[{ value: "", label: "— escolher —" }, ...others]} onChange={doCopy} />
    {/if}
  </div>
{/if}

<style>
  .pe { display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
  .pe-top { display: flex; gap: 4px; flex-wrap: wrap; }
  .pe-list { display: flex; flex-direction: column; gap: 6px; }
  .pe-list.dim { opacity: .5; pointer-events: none; }
  .pe-fx { display: flex; flex-direction: column; gap: 4px; padding: 6px; border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); }
  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }
  .chip.wide { text-align: left; width: 100%; }
</style>