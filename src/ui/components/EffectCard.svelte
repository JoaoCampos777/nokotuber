<script lang="ts">
  import type { AvatarEffect, EffectParams } from "../../effects/effectTypes";
  import { EFFECT_ICONS, EFFECT_PRESETS, paramFieldsFor } from "../../effects/effectPresets";
  import { toggleEffect, removeEffect, duplicateEffect, updateEffect, updateEffectParams } from "../../project/projectStore";
  import SliderControl from "./SliderControl.svelte";
  import SelectControl from "./SelectControl.svelte";

  export let effect: AvatarEffect;

  let expanded = false;

  const triggerOptions = [
    { value: "talking", label: "Ao falar" },
    { value: "always",  label: "Sempre" },
    { value: "idle",    label: "Em silêncio" },
    { value: "blink",   label: "Ao piscar" },
  ];
  const transitionOptions = [
    { value: "none",   label: "Nenhuma" },
    { value: "smooth", label: "Suave" },
    { value: "bounce", label: "Quicar" },
  ];
  const axisOptions = [
    { value: "x",    label: "Horizontal" },
    { value: "y",    label: "Vertical" },
    { value: "both", label: "Ambos" },
  ];

  const paramMeta: Record<string, { label: string; min: number; max: number; step: number; suffix: string; tooltip?: string }> = {
    amount:    { label: "Quantidade", min: 0,   max: 100, step: 1,    suffix: "" },
    speed:     { label: "Velocidade", min: 0,   max: 60,  step: 0.5,  suffix: "" },
    smoothing: { label: "Suavização", min: 0,   max: 0.95,step: 0.05, suffix: "", tooltip: "Quanto maior, mais suave e lento o movimento." },
    intensity: { label: "Intensidade",min: 0,   max: 1,   step: 0.05, suffix: "" },
  };

  $: presets = EFFECT_PRESETS[effect.type];
  $: presetOptions = Object.entries(presets).map(([k, v]) => ({ value: k, label: v.label }));
  $: fields = paramFieldsFor(effect.type);

  function applyPreset(key: string) {
    const preset = presets[key];
    if (!preset) return;
    if (key === "customizado") {
      updateEffect(effect.id, { preset: key });
    } else {
      updateEffect(effect.id, { preset: key });
      updateEffectParams(effect.id, preset.params);
    }
  }

  // Ao mexer manualmente, vira "customizado"
  function onParam(key: keyof EffectParams, v: number) {
    updateEffectParams(effect.id, { [key]: v } as Partial<EffectParams>);
    if (effect.preset !== "customizado") updateEffect(effect.id, { preset: "customizado" });
  }
  function onAxis(v: string) {
  if (v !== "x" && v !== "y" && v !== "both") return;

  updateEffectParams(effect.id, { axis: v });

  if (effect.preset !== "customizado") {
    updateEffect(effect.id, { preset: "customizado" });
  }
}

function isNumberParamKey(field: string): field is "amount" | "speed" | "smoothing" | "intensity" {
  return (
    field === "amount" ||
    field === "speed" ||
    field === "smoothing" ||
    field === "intensity"
  );
}

function getNumberParam(field: string): number {
  if (!isNumberParamKey(field)) return 0;
  return effect.params[field] ?? 0;
}

function onNumberParam(field: string, v: number) {
  if (!isNumberParamKey(field)) return;
  onParam(field, v);
}

function onTrigger(v: string) {
  if (v !== "talking" && v !== "always" && v !== "idle" && v !== "blink") return;
  updateEffect(effect.id, { trigger: v });
}

function onTransition(v: string) {
  if (v !== "none" && v !== "smooth" && v !== "bounce") return;
  updateEffect(effect.id, { transition: v });
}

</script>

<div class="card" class:disabled={!effect.enabled}>
  <div class="card-head">
    <button class="expand" on:click={() => expanded = !expanded}>{expanded ? "▼" : "▶"}</button>
    <span class="icon">{EFFECT_ICONS[effect.type]}</span>
    <div class="head-text">
      <span class="name">{effect.name}</span>
      <span class="trigger">ao {effect.trigger === "talking" ? "falar" : effect.trigger}</span>
    </div>
    <div class="head-actions">
      <button class="mini" class:on={effect.enabled} on:click={() => toggleEffect(effect.id)} title={effect.enabled ? "Desativar" : "Ativar"}>
        {effect.enabled ? "●" : "○"}
      </button>
      <button class="mini" on:click={() => duplicateEffect(effect.id)} title="Duplicar">⧉</button>
      <button class="mini del" on:click={() => removeEffect(effect.id)} title="Remover">×</button>
    </div>
  </div>

  {#if expanded}
    <div class="card-body">
      <SelectControl label="Preset" value={effect.preset} options={presetOptions} onChange={applyPreset} />

      {#each fields as field}
        {#if field === "axis"}
          <SelectControl label="Eixo" value={effect.params.axis ?? "y"} options={axisOptions} onChange={onAxis} />
        {:else}
          {@const meta = paramMeta[field]}
          {#if meta}
            <SliderControl
              label={meta.label} suffix={meta.suffix} tooltip={meta.tooltip ?? ""}
              value={getNumberParam(field)}
              min={meta.min} max={meta.max} step={meta.step}
              onChange={(v) => onNumberParam(field, v)}
            />
          {/if}
        {/if}
      {/each}

      <SelectControl label="Quando atua" value={effect.trigger} options={triggerOptions} onChange={onTrigger} />
      <SelectControl label="Transição" value={effect.transition} options={transitionOptions} onChange={onTransition} />
    </div>
  {/if}
</div>

<style>
  .card { background: var(--color-bg-panel-2); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); overflow: hidden; transition: opacity 0.15s; }
  .card.disabled { opacity: 0.5; }
  .card-head { display: flex; align-items: center; gap: 6px; padding: 7px 8px; }
  .expand { background: none; border: none; color: var(--color-text-dim); cursor: pointer; font-size: 9px; padding: 2px; flex-shrink: 0; }
  .icon { font-size: 16px; flex-shrink: 0; }
  .head-text { flex: 1; display: flex; flex-direction: column; gap: 1px; overflow: hidden; }
  .name { font-size: 12px; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .trigger { font-size: 10px; color: var(--color-text-dim); }
  .head-actions { display: flex; gap: 3px; flex-shrink: 0; }
  .mini { width: 22px; height: 22px; border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); color: var(--color-text-secondary); cursor: pointer; font-size: 13px; line-height: 1; display: flex; align-items: center; justify-content: center; padding: 0; }
  .mini:hover { background: var(--color-accent-soft); color: var(--color-text-primary); }
  .mini.on { color: var(--color-success); }
  .mini.del:hover { background: var(--color-accent-dim); color: white; }
  .card-body { display: flex; flex-direction: column; gap: 8px; padding: 8px 10px 10px; border-top: 1px solid var(--color-border-soft); }
</style>