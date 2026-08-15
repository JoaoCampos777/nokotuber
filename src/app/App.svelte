<script lang="ts">
  import CompanionTutorialModal from "../ui/components/CompanionTutorialModal.svelte";
  import { companionMode } from "../companion/companionUi";
  import EditorView from "../ui/EditorView.svelte";
  import PerformanceView from "../ui/PerformanceView.svelte";
  import CompanionClientView from "../ui/CompanionClientView.svelte";
  import CompanionPerformanceView from "../ui/CompanionPerformanceView.svelte";

  function detectCompanionPerformance(): boolean {
    try {
      if ((location.href || "").includes("view=companion-stage")) return true;
      const label = (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
      return label === "companion-stage";
    } catch { return false; }
  }
  const isCompanionPerformance = detectCompanionPerformance();


  function detectCompanion(): boolean {
    try {
      const s = (location.search || "") + (location.hash || "");
      if (s.includes("mode=companion")) return true;
      const label = (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
      return label === "companion";
    } catch { return false; }
  }
  const isCompanion = detectCompanion();


  function detectPerformance(): boolean {
    try {
      if (window.location.search.includes("performance")) return true;
      if (window.location.hash.includes("performance"))   return true;
      // Label da janela Tauri, lido com segurança (sem import)
      const label = (window as any)?.__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
      if (label === "performance") return true;
    } catch {}
    return false;
  }

  const isPerformance = detectPerformance();

</script>

{#if isCompanionPerformance}
  <CompanionPerformanceView />
{:else if isCompanion || $companionMode}
  <CompanionClientView />
{:else if isPerformance}
  <PerformanceView />
{:else}
  <EditorView />
{/if}
<CompanionTutorialModal />

<style>
  :global(*)    { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    background: transparent;
    overflow: hidden;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #f4ebe8;
  }

  :global(:root) {
    /* Paleta Nokotuber */
    --color-bg-primary:   #1c1818;
    --color-bg-secondary: #261f1f;
    --color-bg-panel:     #27282c;
    --color-bg-panel-2:   #1f2024;
    --color-bg-hover:     #3a2c2c;

    --color-border:       #583535;
    --color-border-soft:  #3a2828;

    --color-accent:       #a21837;
    --color-accent-hover: #c41f44;
    --color-accent-dim:   #4a1018;
    --color-accent-soft:  #2a1419;

    --color-text-primary:   #f4ebe8;
    --color-text-secondary: #b8a8a4;
    --color-text-dim:       #7a6664;

    --color-success:      #4caf82;
    --color-warning:      #e8a94a;
    --color-danger:       #c41f44;

    --radius-sm:    4px;
    --radius-md:    8px;
    --radius-lg:    12px;
    --panel-width:  260px;
  }
</style>