<script lang="ts">
  import SliderControl from "./SliderControl.svelte";
  import { importImageFile } from "../../core/desktop";
  import { VISEMES, VISEME_LABELS, type MouthConfig, type Viseme } from "../../mouth/mouthTypes";

  export let mouth: MouthConfig;
  export let onUpdate: (patch: Partial<MouthConfig>) => void;
  export let onSetImage: (v: Viseme, url: string) => void;
  export let onClearImage: (v: Viseme) => void;

  let importing = "";
  async function importFor(v: Viseme) {
    importing = v;
    try { const url = await importImageFile(); if (url) onSetImage(v, url); }
    finally { importing = ""; }
  }
  function setTransform(patch: Partial<MouthConfig["transform"]>) {
    onUpdate({ transform: { ...mouth.transform, ...patch } });
  }

  $: visemesMode = mouth.mode === "visemes";
  $: separated = mouth.kind === "separated";
</script>

<div class="mo">
  <div class="mo-modes">
    <button class="chip" class:on={!visemesMode} on:click={() => onUpdate({ mode: "simple" })}>Simples</button>
    <button class="chip" class:on={visemesMode} on:click={() => onUpdate({ mode: "visemes" })}>Visemas</button>
  </div>

  {#if !visemesMode}
    <p class="mo-hint">Boca fechada/aberta pelo microfone (padrão). Ative <b>Visemas</b> para formatos de boca por vogal (A/E/I/O/U).</p>
  {:else}
    <div class="mo-modes">
      <button class="chip" class:on={!separated} on:click={() => onUpdate({ kind: "full" })}>Avatar completo</button>
      <button class="chip" class:on={separated} on:click={() => onUpdate({ kind: "separated" })}>Base + boca separada</button>
    </div>
    <p class="mo-hint">
      {#if separated}As imagens abaixo são <b>só a boca</b>, desenhada sobre o avatar base.{:else}Cada imagem é o <b>avatar inteiro</b> naquela vogal.{/if}
    </p>

    <div class="mo-grid">
      {#each VISEMES as v}
        {@const url = mouth.visemes[v]}
        <div class="mo-slot">
          <button class="mo-thumb" title="Importar {VISEME_LABELS[v]}" on:click={() => importFor(v)}>
            {#if importing === v}<span class="ld">…</span>
            {:else if url}<img src={url} alt={VISEME_LABELS[v]} />
            {:else}<span class="plus">+</span>{/if}
          </button>
          <span class="mo-lbl">{VISEME_LABELS[v]}</span>
          {#if url}<button class="mo-clear" on:click={() => onClearImage(v)}>×</button>{/if}
        </div>
      {/each}
    </div>

    <div class="mo-manual">
      <span class="mo-mlbl">Mostrar agora (preview / manual):</span>
      <div class="mo-chips">
        {#each VISEMES as v}
          <button class="chip sm" class:on={mouth.manualViseme === v} on:click={() => onUpdate({ manualViseme: v })}>{VISEME_LABELS[v]}</button>
        {/each}
      </div>
    </div>

    {#if separated}
      <SliderControl label="Boca X" value={mouth.transform.x} min={-1000} max={1000} step={1} onChange={(val) => setTransform({ x: val })} />
      <SliderControl label="Boca Y" value={mouth.transform.y} min={-1000} max={1000} step={1} onChange={(val) => setTransform({ y: val })} />
      <SliderControl label="Escala da boca" suffix="x" value={mouth.transform.scale} min={0.05} max={5} step={0.05} onChange={(val) => setTransform({ scale: val })} />
      <SliderControl label="Rotação da boca" suffix="°" value={mouth.transform.rotation} min={-180} max={180} step={1} onChange={(val) => setTransform({ rotation: val })} />
    {/if}

    <p class="mo-exp">🧪 Reconhecimento automático de vogal: <b>experimental/futuro</b>. O volume do microfone não identifica a vogal, então por ora o viseme é manual. (ver VISEMES.md)</p>
  {/if}
</div>

<style>
  .mo { display: flex; flex-direction: column; gap: 6px; }
  .mo-modes { display: flex; gap: 4px; flex-wrap: wrap; }
  .mo-hint { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }

  .mo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .mo-slot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; }
  .mo-thumb { width: 100%; height: 44px; border: 1px dashed var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-panel-2); cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0; }
  .mo-thumb:hover { border-color: var(--color-accent); }
  .mo-thumb img { width: 100%; height: 100%; object-fit: contain; }
  .plus { font-size: 16px; color: var(--color-text-dim); }
  .ld { color: var(--color-text-dim); }
  .mo-lbl { font-size: 9px; color: var(--color-text-secondary); font-weight: 600; }
  .mo-clear { position: absolute; top: 0; right: 0; width: 15px; height: 15px; border: none; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; cursor: pointer; font-size: 10px; line-height: 1; padding: 0; }
  .mo-clear:hover { background: var(--color-danger); }

  .mo-manual { display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--color-border-soft); padding-top: 6px; }
  .mo-mlbl { font-size: 10px; color: var(--color-text-secondary); }
  .mo-chips { display: flex; gap: 3px; flex-wrap: wrap; }

  .mo-exp { font-size: 9.5px; color: var(--color-text-dim); line-height: 1.5; margin: 2px 0 0; border-top: 1px solid var(--color-border-soft); padding-top: 6px; }

  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }
  .chip.sm { padding: 3px 7px; font-size: 10px; }
</style>
