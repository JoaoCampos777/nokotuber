<script lang="ts">
  import SliderControl from "./SliderControl.svelte";
  import { importImageFile } from "../../core/desktop";
  import type { Addon } from "../../addons/addonTypes";

  export let addons: Addon[] = [];
  export let onAdd: () => void;
  export let onRemove: (id: string) => void;
  export let onUpdate: (id: string, patch: Partial<Addon>) => void;

  let importing = "";
  let editingId = "";

  async function importFor(id: string) {
    importing = id;
    try { const url = await importImageFile(); if (url) onUpdate(id, { image: url }); }
    finally { importing = ""; }
  }
  function toggleEdit(id: string) { editingId = editingId === id ? "" : id; }
  function onName(id: string, e: Event) { onUpdate(id, { name: (e.target as HTMLInputElement).value }); }
</script>

<div class="ad">
  <p class="ad-intro">Acessórios sobre o personagem (óculos, chapéu, coroa, overlays…). Cada um tem posição, escala e camada próprias.</p>

  {#if addons.length === 0}
    <p class="ad-empty">Nenhum acessório ainda.</p>
  {:else}
    <div class="ad-list">
      {#each addons as a (a.id)}
        <div class="ad-item" class:off={!a.visible}>
          <div class="ad-top">
            <button class="ad-thumb" title="Importar imagem" on:click={() => importFor(a.id)}>
              {#if importing === a.id}<span class="ld">…</span>
              {:else if a.image}<img src={a.image} alt={a.name} />
              {:else}<span class="plus">+</span>{/if}
            </button>
            <input class="ad-name" value={a.name} on:input={(e) => onName(a.id, e)} />
            <button class="mini" class:on={a.visible} title={a.visible ? "Visível" : "Oculto"} on:click={() => onUpdate(a.id, { visible: !a.visible })}>{a.visible ? "👁" : "🚫"}</button>
            <button class="mini" class:on={editingId === a.id} title="Editar" on:click={() => toggleEdit(a.id)}>✏</button>
            <button class="mini danger" title="Remover" on:click={() => onRemove(a.id)}>🗑</button>
          </div>

          {#if editingId === a.id}
            <div class="ad-edit">
              <SliderControl label="Posição X" value={a.x} min={-1000} max={1000} step={1} onChange={(v) => onUpdate(a.id, { x: v })} />
              <SliderControl label="Posição Y" value={a.y} min={-1000} max={1000} step={1} onChange={(v) => onUpdate(a.id, { y: v })} />
              <SliderControl label="Escala" suffix="x" value={a.scale} min={0.05} max={5} step={0.05} onChange={(v) => onUpdate(a.id, { scale: v })} />
              <SliderControl label="Rotação" suffix="°" value={a.rotation} min={-180} max={180} step={1} onChange={(v) => onUpdate(a.id, { rotation: v })} />
              <SliderControl label="Opacidade" value={a.opacity} min={0.05} max={1} step={0.05} onChange={(v) => onUpdate(a.id, { opacity: v })} />
              <SliderControl label="Camada" value={a.zIndex} min={-5} max={5} step={1}
                tooltip="Negativo fica atrás do personagem; positivo, à frente."
                onChange={(v) => onUpdate(a.id, { zIndex: v })} />
              <button class="chip" class:on={a.mirror} on:click={() => onUpdate(a.id, { mirror: !a.mirror })}>⇄ Espelhar</button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <button class="chip full" on:click={onAdd}>＋ Adicionar acessório</button>
</div>

<style>
  .ad { display: flex; flex-direction: column; gap: 6px; }
  .ad-intro { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }
  .ad-empty { font-size: 10px; color: var(--color-text-dim); margin: 0; text-align: center; }

  .ad-list { display: flex; flex-direction: column; gap: 5px; }
  .ad-item { border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); padding: 5px 6px; display: flex; flex-direction: column; gap: 5px; }
  .ad-item.off { opacity: .55; }
  .ad-top { display: flex; align-items: center; gap: 5px; }
  .ad-thumb { width: 34px; height: 34px; flex-shrink: 0; border: 1px dashed var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-panel-2); cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0; }
  .ad-thumb:hover { border-color: var(--color-accent); }
  .ad-thumb img { width: 100%; height: 100%; object-fit: contain; }
  .plus { font-size: 16px; color: var(--color-text-dim); }
  .ld { color: var(--color-text-dim); }
  .ad-name { flex: 1; min-width: 0; background: var(--color-bg-panel-2); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 6px; font-size: 11px; font-family: inherit; }

  .ad-edit { display: flex; flex-direction: column; gap: 5px; border-top: 1px solid var(--color-border-soft); padding-top: 5px; }

  .mini { flex-shrink: 0; background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 3px 6px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .mini:hover { background: var(--color-bg-hover); }
  .mini.on { color: var(--color-accent); border-color: var(--color-accent-dim); }
  .mini.danger:hover { background: var(--color-danger); color: #fff; border-color: var(--color-danger); }
  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }
  .chip.full { width: 100%; }
</style>
