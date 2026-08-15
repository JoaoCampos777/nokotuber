<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { listen, emit } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let imgUrl: string | null = null;
  let unlistenFn: (() => void) | null = null;

  function isDesktop() { return typeof (window as any).__TAURI_INTERNALS__ !== "undefined"; }
  async function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); try { await getCurrentWindow().close(); } catch {} }
  }

  onMount(async () => {
    window.addEventListener("keydown", handleKeydown);
    if (isDesktop()) {
      unlistenFn = await listen<string | null>("companion-avatar:image", (ev) => {
        imgUrl = (ev.payload as any) ?? null;
      });
      await emit("companion-performance:ready", null); // pede a imagem atual ao Companion
    }
  });

  onDestroy(() => {
    unlistenFn?.();
    window.removeEventListener("keydown", handleKeydown);
  });
</script>

<div class="cp">
  {#if imgUrl}
    <img class="avatar" src={imgUrl} alt="" />
  {:else}
    <div class="ph">Aguardando o Companion…<br /><small>Conecte e fale para o personagem aparecer.</small></div>
  {/if}
</div>

<style>
  :global(html), :global(body) { margin: 0; background: #1c1818; }
  .cp { width: 100vw; height: 100vh; background: #1c1818; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .avatar { max-width: 100%; max-height: 100%; object-fit: contain; }
  .ph { color: #b8a8a4; font-family: system-ui, sans-serif; text-align: center; font-size: 16px; line-height: 1.5; }
  .ph small { color: #7a6664; font-size: 13px; }
</style>