<script lang="ts">
  import SliderControl from "./SliderControl.svelte";
  import SelectControl from "./SelectControl.svelte";
  import {
    participantEffects, setParticipantEffectsEnabled, setPresetEnabled,
    updatePreset, copyEffectsTo, resetParticipantEffects,
    setVoiceReactionEnabled, toggleVoiceReactionEffect, updateVoiceReaction,
  } from "../../effects/participantEffectsStore";
  import { PARTICIPANT_EFFECT_KEYS, PARTICIPANT_EFFECT_LABELS } from "../../effects/participantEffects";
  import { EFFECT_TYPE_OPTIONS } from "../../audio/voiceReactionTypes";
  import { simulateParticipantReaction } from "../../companion/companionHostSync";

  export let participantId: string;
  export let others: { value: string; label: string }[] = [];

  $: fx = $participantEffects.find((e) => e.participantId === participantId);
  $: vr = fx?.voiceReaction;

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

    {#if vr}
      <div class="vr">
        <div class="vr-head">
          <span class="vr-title">Reação de voz</span>
          <button class="chip" class:on={vr.enabled}
            on:click={() => setVoiceReactionEnabled(participantId, !vr.enabled)}>
            {vr.enabled ? "● Ativa" : "○ Desativada"}
          </button>
        </div>
        <div class="vr-fx">
          {#each EFFECT_TYPE_OPTIONS as opt}
            <button class="chip" class:on={vr.effects.includes(opt.value)}
              on:click={() => toggleVoiceReactionEffect(participantId, opt.value)}>
              {vr.effects.includes(opt.value) ? "☑" : "☐"} {opt.label}
            </button>
          {/each}
        </div>
        <SliderControl label="Intensidade" value={vr.intensity} min={0} max={100} step={1}
          onChange={(v) => updateVoiceReaction(participantId, { intensity: v })} />
        <SliderControl label="Duração" suffix="ms" value={vr.durationMs} min={150} max={2500} step={50}
          onChange={(v) => updateVoiceReaction(participantId, { durationMs: v })} />
        <SliderControl label="Cooldown" suffix="ms" value={vr.cooldownMs} min={0} max={4000} step={50}
          onChange={(v) => updateVoiceReaction(participantId, { cooldownMs: v })} />
        <button class="chip wide" on:click={() => simulateParticipantReaction(participantId)}>⚡ Testar reação</button>
        <span class="vr-note">"Trocar expressão" não tem efeito na sala (avatares só têm imagens base).</span>
      </div>
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

  .vr { display: flex; flex-direction: column; gap: 6px; padding: 6px; border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); }
  .vr-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .vr-title { font-size: 11px; font-weight: 700; color: var(--color-accent); }
  .vr-fx { display: flex; flex-direction: column; gap: 4px; }
  .vr-fx .chip { text-align: left; width: 100%; }
  .vr-note { font-size: 9px; color: var(--color-text-dim); line-height: 1.4; }
</style>