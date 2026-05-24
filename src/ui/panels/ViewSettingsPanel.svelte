<script lang="ts">
  import { project, updateView, updateViewFilters } from "../../project/projectStore";
  import SliderControl from "../components/SliderControl.svelte";
  import SelectControl from "../components/SelectControl.svelte";

  const sizeModeOptions = [
    { value: "auto",   label: "Automático" },
    { value: "manual", label: "Manual" },
  ];
  const bgModeOptions = [
    { value: "transparent", label: "Transparente" },
    { value: "color",       label: "Cor sólida" },
    { value: "chroma",      label: "Chroma key" },
  ];

  function onBgColor(e: Event) {
    updateView({ backgroundColor: (e.target as HTMLInputElement).value });
  }
    function onAvatarSizeMode(v: string) {
    if (v !== "auto" && v !== "manual") return;

    updateView({
        avatarSizeMode: v,
    });
    }

    function onBackgroundMode(v: string) {
    if (v !== "transparent" && v !== "color" && v !== "chroma") return;

    updateView({
        backgroundMode: v,
        backgroundColor: v === "chroma" ? "#00FF00" : $project.view.backgroundColor,
    });
    }

</script>

<div class="panel-content">
  <!-- AVATAR -->
  <div class="group">
    <div class="group-title">Avatar</div>

    <SelectControl
      label="Tamanho"
      tooltip="Automático: o avatar se ajusta ao canvas. Manual: você controla com o multiplicador."
      value={$project.view.avatarSizeMode}
      options={sizeModeOptions}
      onChange={onAvatarSizeMode}
    />

    {#if $project.view.avatarSizeMode === "manual"}
      <SliderControl
        label="Multiplicador" suffix="x" tooltip="Aumenta ou diminui o tamanho final do avatar na tela."
        value={$project.view.sizeMultiplier} min={0.25} max={3} step={0.05}
        onChange={(v) => updateView({ sizeMultiplier: v })}
      />
    {/if}

    <SliderControl
      label="Posição X" suffix="px"
      value={$project.view.positionX} min={-1000} max={1000} step={1}
      onChange={(v) => updateView({ positionX: v })}
    />
    <SliderControl
      label="Posição Y" suffix="px"
      value={$project.view.positionY} min={-1000} max={1000} step={1}
      onChange={(v) => updateView({ positionY: v })}
    />
    <SliderControl
      label="Escala do movimento" suffix="x"
      tooltip="Intensidade global dos efeitos de movimento. Em 0, os movimentos ficam desativados."
      value={$project.view.movementScale} min={0} max={3} step={0.05}
      onChange={(v) => updateView({ movementScale: v })}
    />
  </div>

  <!-- FUNDO -->
  <div class="group">
    <div class="group-title">Fundo</div>
    <SelectControl
      label="Modo de fundo"
      tooltip="Chroma key usa verde puro (#00FF00) para você remover no OBS."
      value={$project.view.backgroundMode}
      options={bgModeOptions}
      onChange={onBackgroundMode}
    />
    {#if $project.view.backgroundMode !== "transparent"}
      <div class="color-row">
        <span class="color-label">Cor</span>
        <input type="color" value={$project.view.backgroundColor} on:input={onBgColor} />
        <span class="color-hex">{$project.view.backgroundColor}</span>
      </div>
    {/if}
  </div>

  <!-- AJUSTES -->
  <div class="group">
    <div class="group-title">Ajustes</div>
    <SliderControl
      label="Matiz" suffix="°"
      value={$project.view.filters.hue} min={-180} max={180} step={1}
      onChange={(v) => updateViewFilters({ hue: v })}
    />
    <SliderControl
      label="Saturação" suffix="x"
      value={$project.view.filters.saturation} min={0} max={3} step={0.05}
      onChange={(v) => updateViewFilters({ saturation: v })}
    />
    <SliderControl
      label="Brilho" suffix="x"
      value={$project.view.filters.brightness} min={0} max={3} step={0.05}
      onChange={(v) => updateViewFilters({ brightness: v })}
    />
  </div>
</div>

<style>
  .panel-content { display: flex; flex-direction: column; }
  .group { padding: 10px 12px; border-bottom: 1px solid var(--color-border-soft); display: flex; flex-direction: column; gap: 8px; }
  .group-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--color-accent); }
  .color-row { display: flex; align-items: center; gap: 8px; }
  .color-label { font-size: 11px; color: var(--color-text-secondary); width: 30px; }
  .color-row input[type="color"] { width: 40px; height: 26px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: none; cursor: pointer; padding: 0; }
  .color-hex { font-size: 11px; color: var(--color-text-dim); font-variant-numeric: tabular-nums; }
</style>