<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import {
    activeTour, tourIndex, tourMenuOpen,
    nextStep, prevStep, endTour, startTour, closeTourMenu,
  } from "../tourStore";
  import { ALL_TOURS } from "../tours";

  let rect: DOMRect | null = null;
  let placeAbove = false;

  $: step = $activeTour ? $activeTour.steps[$tourIndex] : null;

  async function measure() {
    rect = null;
    const s = $activeTour ? $activeTour.steps[$tourIndex] : null;
    if (!s || !s.target) return;
    await tick();
    const el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
    if (!el) return;
    try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch {}
    await tick();
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    rect = r;
    placeAbove = r.bottom > window.innerHeight * 0.55;
  }

  // Recalcula ao trocar de passo/tour.
  $: if ($activeTour) { void $tourIndex; measure(); }

  function onKey(e: KeyboardEvent) {
    if (!$activeTour) return;
    if (e.key === "Escape") endTour();
    else if (e.key === "ArrowRight") nextStep();
    else if (e.key === "ArrowLeft") prevStep();
  }
  function onResize() { if ($activeTour) measure(); }
  onMount(() => { window.addEventListener("keydown", onKey); window.addEventListener("resize", onResize, true); });
  onDestroy(() => { window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize, true); });

  $: ttStyle = (() => {
    if (!rect) return "top:50%; left:50%; transform:translate(-50%,-50%);";
    const w = 300;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - w / 2, 12), Math.max(12, window.innerWidth - w - 12));
    return placeAbove
      ? `left:${left}px; top:${rect.top - 12}px; transform:translateY(-100%);`
      : `left:${left}px; top:${rect.bottom + 12}px;`;
  })();
  $: hlStyle = rect ? `left:${rect.left - 4}px; top:${rect.top - 4}px; width:${rect.width + 8}px; height:${rect.height + 8}px;` : "";
</script>

{#if $tourMenuOpen}
  <div class="ov" role="presentation" on:click|self={closeTourMenu}>
    <div class="menu">
      <h3>Tutorial</h3>
      <p class="menu-sub">Escolha um guia rápido:</p>
      {#each ALL_TOURS as t}
        <button class="menu-item" on:click={() => startTour(t)}>
          <span class="menu-name">{t.name}</span>
          <span class="menu-desc">{t.desc}</span>
        </button>
      {/each}
      <div class="menu-actions"><button class="b" on:click={closeTourMenu}>Fechar</button></div>
    </div>
  </div>
{/if}

{#if $activeTour && step}
  <div class="tour">
    <div class="backdrop" class:dim={!rect}></div>
    {#if rect}<div class="highlight" style={hlStyle}></div>{/if}
    <div class="tip" style={ttStyle}>
      <div class="tip-title">{step.title}</div>
      <div class="tip-body">{step.body}</div>
      <div class="tip-foot">
        <span class="tip-count">{$tourIndex + 1} / {$activeTour.steps.length}</span>
        <div class="tip-btns">
          <button class="b ghost" on:click={endTour}>Pular</button>
          {#if $tourIndex > 0}<button class="b" on:click={prevStep}>Voltar</button>{/if}
          <button class="b accent" on:click={nextStep}>
            {$tourIndex === $activeTour.steps.length - 1 ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .ov { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 4100; padding: 16px; }
  .menu { box-sizing: border-box; width: 100%; max-width: 400px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; font-family: system-ui, sans-serif; }
  .menu h3 { margin: 0; font-size: 16px; color: var(--color-text-primary); }
  .menu-sub { margin: 0 0 4px; font-size: 12px; color: var(--color-text-dim); }
  .menu-item { display: flex; flex-direction: column; gap: 2px; text-align: left; background: var(--color-bg-panel-2); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); padding: 9px 11px; cursor: pointer; font-family: inherit; }
  .menu-item:hover { border-color: var(--color-accent-dim); background: var(--color-bg-hover); }
  .menu-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
  .menu-desc { font-size: 11px; color: var(--color-text-dim); }
  .menu-actions { display: flex; justify-content: flex-end; margin-top: 4px; }

  .tour { position: fixed; inset: 0; z-index: 4000; }
  .backdrop { position: absolute; inset: 0; }
  .backdrop.dim { background: rgba(0,0,0,.6); }
  .highlight { position: fixed; border-radius: 8px; box-shadow: 0 0 0 9999px rgba(0,0,0,.6), 0 0 0 2px var(--color-accent); pointer-events: none; transition: all .18s ease; z-index: 4001; }

  .tip { position: fixed; z-index: 4002; box-sizing: border-box; width: 300px; max-width: calc(100vw - 24px); background: var(--color-bg-secondary); border: 1px solid var(--color-accent-dim); border-radius: 12px; padding: 13px 14px; box-shadow: 0 10px 30px rgba(0,0,0,.5); font-family: system-ui, sans-serif; }
  .tip-title { font-size: 14px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 5px; }
  .tip-body { font-size: 12.5px; line-height: 1.5; color: var(--color-text-secondary); }
  .tip-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; }
  .tip-count { font-size: 11px; color: var(--color-text-dim); flex-shrink: 0; }
  .tip-btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

  .b { padding: 6px 11px; border-radius: 7px; border: 1px solid var(--color-border); background: transparent; color: var(--color-text-secondary); cursor: pointer; font-size: 12px; font-family: inherit; }
  .b:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .b.ghost { border-color: transparent; }
  .b.accent { background: var(--color-accent); border-color: var(--color-accent); color: #fff; font-weight: 600; }
  .b.accent:hover { background: var(--color-accent-hover); }
</style>
