<script lang="ts">
  import { uiPrefs, setUiMode } from "../uiPrefsStore";
</script>

<div class="sw" role="group" aria-label="Modo de interface" title="Modo simples esconde opções avançadas">
  <button class="opt" class:on={$uiPrefs.mode === "simple"} on:click={() => setUiMode("simple")}>Simples</button>
  <button class="opt" class:on={$uiPrefs.mode === "advanced"} on:click={() => setUiMode("advanced")}>Avançado</button>
</div>

<style>
  .sw { display: inline-flex; border: 1px solid var(--color-border); border-radius: 999px; overflow: hidden; flex-shrink: 0; }
  .opt { background: transparent; border: none; padding: 5px 11px; font-size: 12px; color: var(--color-text-dim); cursor: pointer; font-family: inherit; white-space: nowrap; }
  .opt:hover { color: var(--color-text-secondary); }
  .opt.on { background: var(--color-accent); color: #fff; font-weight: 600; }
</style>
