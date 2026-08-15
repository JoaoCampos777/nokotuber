<script lang="ts">
  import { onMount } from "svelte";

  export let title: string;
  export let open = true;
  /** Se definido, lembra o estado aberto/fechado no localStorage. */
  export let storageKey: string | null = null;
  /** Selo opcional à direita do título (ex.: contagem ou status). */
  export let badge: string | null = null;

  const KEY = storageKey ? `nokotuber:acc:${storageKey}` : null;

  onMount(() => {
    if (!KEY) return;
    try {
      const v = localStorage.getItem(KEY);
      if (v === "0") open = false;
      else if (v === "1") open = true;
    } catch {}
  });

  function toggle() {
    open = !open;
    if (KEY) { try { localStorage.setItem(KEY, open ? "1" : "0"); } catch {} }
  }
</script>

<section class="acc">
  <button class="acc-head" on:click={toggle} aria-expanded={open}>
    <span class="acc-caret">{open ? "▾" : "▸"}</span>
    <span class="acc-title">{title}</span>
    {#if badge}<span class="acc-badge">{badge}</span>{/if}
  </button>
  {#if open}
    <div class="acc-body"><slot /></div>
  {/if}
</section>

<style>
  .acc { box-sizing: border-box; width: 100%; min-width: 0; border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-bg-panel-2); overflow: hidden; }
  .acc * { box-sizing: border-box; }
  .acc-head { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 10px; background: transparent; border: none; cursor: pointer; font-family: inherit; color: var(--color-text-secondary); font-size: 12px; font-weight: 700; text-align: left; }
  .acc-head:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .acc-caret { color: var(--color-text-dim); font-size: 10px; width: 12px; flex-shrink: 0; }
  .acc-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .acc-badge { flex-shrink: 0; font-size: 10px; font-weight: 600; color: var(--color-accent); background: var(--color-accent-soft); border: 1px solid var(--color-accent-dim); border-radius: 999px; padding: 1px 7px; }
  .acc-body { padding: 8px 10px 10px; border-top: 1px solid var(--color-border-soft); }
</style>
