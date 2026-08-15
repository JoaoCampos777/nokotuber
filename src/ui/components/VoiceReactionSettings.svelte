<script lang="ts">
  import SliderControl from "./SliderControl.svelte";
  import SelectControl from "./SelectControl.svelte";
  import {
    audioLevel, audioThreshold, isReacting,
    voiceReactionRule, updateVoiceReactionRule, simulateReaction,
  } from "../../audio/audioStore";
  import { EFFECT_TYPE_OPTIONS, type VoiceReactionEffectType } from "../../audio/voiceReactionTypes";
  import { activeSet } from "../../project/expressionStore";

  function toggleEffect(v: VoiceReactionEffectType) {
    const cur = $voiceReactionRule.effects;
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    updateVoiceReactionRule({ effects: next });
  }
  function onTempExp(v: string)  { updateVoiceReactionRule({ temporaryExpressionId: v || null }); }
  function toggleEnabled()       { updateVoiceReactionRule({ enabled: !$voiceReactionRule.enabled }); }
  function onName(e: Event)      { updateVoiceReactionRule({ name: (e.target as HTMLInputElement).value }); }

  $: expOptions = [
    { value: "", label: "— escolher —" },
    ...($activeSet?.expressions ?? []).map((e) => ({ value: e.id, label: e.name })),
  ];
</script>

<div class="vr">
  <div class="vr-head">
    <input class="vr-name" value={$voiceReactionRule.name} on:input={onName} />
    <button class="vr-toggle" class:on={$voiceReactionRule.enabled} on:click={toggleEnabled}>
      {$voiceReactionRule.enabled ? "● Ativa" : "○ Desativada"}
    </button>
  </div>

  <div class="meter">
    <div class="meter-fill" class:react={$isReacting} style="width:{$audioLevel}%"></div>
    <div class="meter-mark speech" style="left:{$audioThreshold}%"></div>
    <div class="meter-mark react"  style="left:{$voiceReactionRule.triggerThreshold}%"></div>
  </div>
  <div class="legend">
    <span><i class="sw speech"></i> Fala {$audioThreshold}</span>
    <span><i class="sw react"></i> Reação {$voiceReactionRule.triggerThreshold}</span>
  </div>

  <SliderControl label="Quando começa a falar" value={$audioThreshold} min={0} max={100} step={1}
    tooltip="A partir deste volume o avatar começa a falar."
    onChange={(v) => audioThreshold.set(v)} />

  <SliderControl label="Quando ativa reação" value={$voiceReactionRule.triggerThreshold} min={0} max={100} step={1}
    tooltip="Volume mais alto que dispara a reação."
    onChange={(v) => updateVoiceReactionRule({ triggerThreshold: v })} />

  <div class="fx-label">Efeitos (pode combinar vários)</div>
  <div class="fx-list">
    {#each EFFECT_TYPE_OPTIONS as opt}
      <button class="fx-chip" class:on={$voiceReactionRule.effects.includes(opt.value)}
              on:click={() => toggleEffect(opt.value)}>
        {$voiceReactionRule.effects.includes(opt.value) ? "☑" : "☐"} {opt.label}
      </button>
    {/each}
  </div>

  {#if $voiceReactionRule.effects.includes("expressionSwap")}
    <SelectControl label="Expressão temporária" value={$voiceReactionRule.temporaryExpressionId ?? ""}
      options={expOptions} onChange={onTempExp} />
  {/if}

  <SliderControl label="Intensidade" suffix="%" value={$voiceReactionRule.intensity} min={0} max={100} step={1}
    onChange={(v) => updateVoiceReactionRule({ intensity: v })} />
  <SliderControl label="Duração" suffix="ms" value={$voiceReactionRule.durationMs} min={200} max={3000} step={50}
    onChange={(v) => updateVoiceReactionRule({ durationMs: v })} />
  <SliderControl label="Cooldown" suffix="ms" value={$voiceReactionRule.cooldownMs} min={0} max={5000} step={50}
    onChange={(v) => updateVoiceReactionRule({ cooldownMs: v })} />

  <button class="scare-btn" on:click={simulateReaction}>▶ Testar reação</button>

  <p class="hint">
    O <b>limiar de fala</b> controla quando o avatar começa a falar.
    O <b>limiar de reação</b> dispara os efeitos marcados — útil para gritos, sustos, empolgação ou impacto.
  </p>
</div>

<style>
  .vr { display: flex; flex-direction: column; gap: 6px; }
  .vr-head { display: flex; align-items: center; gap: 6px; }
  .vr-name { flex: 1; background: var(--color-bg-panel-2); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 12px; font-weight: 700; font-family: inherit; }
  .vr-toggle { background: transparent; border: 1px solid var(--color-border-soft); color: var(--color-text-dim); font-size: 10px; padding: 4px 8px; border-radius: 999px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .vr-toggle.on { color: var(--color-accent); border-color: var(--color-accent-dim); }

  .meter { position: relative; height: 8px; background: var(--color-bg-hover); border-radius: 4px; overflow: hidden; }
  .meter-fill { height: 100%; background: var(--color-success); transition: width .05s; }
  .meter-fill.react { background: var(--color-danger); }
  .meter-mark { position: absolute; top: -2px; width: 2px; height: 12px; transform: translateX(-50%); }
  .meter-mark.speech { background: var(--color-warning); }
  .meter-mark.react  { background: var(--color-danger); }
  .legend { display: flex; justify-content: space-between; font-size: 9px; color: var(--color-text-dim); }
  .sw { display: inline-block; width: 8px; height: 8px; border-radius: 2px; vertical-align: middle; }
  .sw.speech { background: var(--color-warning); }
  .sw.react  { background: var(--color-danger); }

  .fx-label { font-size: 10px; color: var(--color-text-secondary); margin-top: 4px; }
  .fx-list { display: flex; flex-direction: column; gap: 3px; }
  .fx-chip { text-align: left; background: var(--color-bg-panel-2); color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .fx-chip:hover { background: var(--color-bg-hover); }
  .fx-chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }

  .scare-btn { margin-top: 4px; background: var(--color-accent-soft); color: var(--color-accent-hover); border: 1px solid var(--color-accent-dim); border-radius: var(--radius-sm); padding: 7px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .scare-btn:hover { background: var(--color-accent); color: #fff; }
  .hint { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; margin: 2px 0 0; }
</style>