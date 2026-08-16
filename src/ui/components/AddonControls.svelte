<script lang="ts">
  import SliderControl from "./SliderControl.svelte";
  import type { Addon } from "../../addons/addonTypes";
  import {
    storeSession, storeLibrary, loadLibrary, downloadProductAsset,
    StoreError, type StoreProductCard,
  } from "../../store/storeClient";
  import { openStore } from "../../store/storeUi";

  export let addons: Addon[] = [];
  export let onAdd: () => string;                          // cria addon vazio, retorna id
  export let onRemove: (id: string) => void;
  export let onUpdate: (id: string, patch: Partial<Addon>) => void;

  let editingId = "";
  let showLib = false;
  let busy = false;
  let msg = "";

  function toggleEdit(id: string) { editingId = editingId === id ? "" : id; }
  $: appliedProductIds = new Set(addons.filter((a) => a.productId).map((a) => a.productId));

  async function openLibrary() {
    showLib = true; msg = "";
    if ($storeSession) { try { await loadLibrary(); } catch { /* mostra o que tem */ } }
  }
  async function addFromLibrary(p: StoreProductCard) {
    if (appliedProductIds.has(p.id)) return;
    busy = true; msg = "";
    try {
      const { dataUrl, version } = await downloadProductAsset(p.id, p.version);
      const id = onAdd();
      onUpdate(id, { name: p.name, image: dataUrl, source: "marketplace", productId: p.id, author: p.author, version, visible: true });
      msg = `"${p.name}" adicionado ao personagem.`;
    } catch (e) {
      console.error("[store] addFromLibrary falhou:", e);
      const code = e instanceof StoreError ? e.code : "";
      msg = code === "not_entitled" ? "Item não disponível nesta conta."
        : (code === "download_failed" || code === "asset_unavailable" || code === "file_missing") ? "Não foi possível baixar este acessório."
        : "Não foi possível adicionar o acessório.";
    } finally { busy = false; }
  }
  function goStore() { showLib = false; openStore(); }
</script>

<div class="ad">
  <p class="ad-intro">Acessórios são conteúdo da <b>Loja Nokotuber</b> — adicione itens que você possui na sua Biblioteca.</p>

  {#if addons.length === 0}
    <p class="ad-empty">Nenhum acessório aplicado.</p>
  {:else}
    <div class="ad-list">
      {#each addons as a (a.id)}
        <div class="ad-item" class:off={!a.visible}>
          <div class="ad-top">
            <div class="ad-thumb">{#if a.image}<img src={a.image} alt={a.name} />{:else}<span class="plus">🎀</span>{/if}</div>
            <span class="ad-name" title={a.name}>{a.name}{#if a.source === "local"}<span class="legacy" title="Acessório local antigo">local</span>{/if}</span>
            <button class="mini" class:on={a.visible} title={a.visible ? "Visível" : "Oculto"} on:click={() => onUpdate(a.id, { visible: !a.visible })}>{a.visible ? "👁" : "🚫"}</button>
            <button class="mini" class:on={editingId === a.id} title="Editar" on:click={() => toggleEdit(a.id)}>✏</button>
            <button class="mini danger" title="Remover do personagem" on:click={() => onRemove(a.id)}>🗑</button>
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

  <div class="ad-actions">
    <button class="chip accent full" disabled={busy} on:click={openLibrary}>＋ Adicionar da Biblioteca</button>
    <button class="chip full" on:click={goStore}>🛒 Abrir Loja</button>
  </div>

  {#if showLib}
    <div class="ad-lib">
      <div class="ad-lib-head"><span>Sua Biblioteca</span><button class="mini" on:click={() => showLib = false}>×</button></div>
      {#if !$storeSession}
        <p class="ad-empty">Entre na Loja para ver seus itens.</p>
        <button class="chip full" on:click={goStore}>Abrir Loja</button>
      {:else if $storeLibrary.length === 0}
        <p class="ad-empty">Você ainda não tem itens. Obtenha grátis ou compre na Loja.</p>
        <button class="chip full" on:click={goStore}>Abrir Loja</button>
      {:else}
        {#each $storeLibrary as it (it.productId)}
          <div class="ad-lib-item">
            <span class="ad-name" title={it.product.name}>{it.product.name}</span>
            {#if appliedProductIds.has(it.productId)}
              <span class="applied">✓ já adicionado</span>
            {:else}
              <button class="mini accent" disabled={busy} on:click={() => addFromLibrary(it.product)}>Adicionar</button>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  {#if msg}<p class="ad-msg">{msg}</p>{/if}
</div>

<style>
  .ad { display: flex; flex-direction: column; gap: 6px; }
  .ad-intro { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }
  .ad-empty { font-size: 10px; color: var(--color-text-dim); margin: 0; text-align: center; padding: 4px; }

  .ad-list { display: flex; flex-direction: column; gap: 5px; }
  .ad-item { border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); padding: 5px 6px; display: flex; flex-direction: column; gap: 5px; }
  .ad-item.off { opacity: .55; }
  .ad-top { display: flex; align-items: center; gap: 5px; }
  .ad-thumb { width: 32px; height: 32px; flex-shrink: 0; border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-panel-2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .ad-thumb img { width: 100%; height: 100%; object-fit: contain; }
  .plus { font-size: 16px; }
  .ad-name { flex: 1; min-width: 0; font-size: 11px; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
  .legacy { font-size: 8px; color: var(--color-text-dim); border: 1px solid var(--color-border-soft); border-radius: 3px; padding: 0 3px; }
  .ad-edit { display: flex; flex-direction: column; gap: 5px; border-top: 1px solid var(--color-border-soft); padding-top: 5px; }

  .ad-actions { display: flex; flex-direction: column; gap: 4px; }
  .ad-lib { border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-panel-2); padding: 6px; display: flex; flex-direction: column; gap: 4px; }
  .ad-lib-head { display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 700; color: var(--color-text-secondary); }
  .ad-lib-item { display: flex; align-items: center; gap: 6px; }
  .applied { font-size: 10px; color: var(--color-success); font-weight: 600; white-space: nowrap; }
  .ad-msg { font-size: 10px; color: var(--color-text-secondary); margin: 0; }

  .mini { flex-shrink: 0; background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 3px 6px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .mini:hover { background: var(--color-bg-hover); }
  .mini:disabled { opacity: .5; cursor: not-allowed; }
  .mini.on { color: var(--color-accent); border-color: var(--color-accent-dim); }
  .mini.accent { color: var(--color-accent); border-color: var(--color-accent-dim); }
  .mini.danger:hover { background: var(--color-danger); color: #fff; border-color: var(--color-danger); }
  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip:disabled { opacity: .5; cursor: not-allowed; }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }
  .chip.accent { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
  .chip.accent:hover:not(:disabled) { background: var(--color-accent-hover); }
  .chip.full { width: 100%; }
</style>
