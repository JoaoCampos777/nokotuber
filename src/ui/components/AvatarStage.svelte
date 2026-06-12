<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { Renderer2D, type FrameInput } from "../../renderer/Renderer2D";
  import { avatarState } from "../../avatar/avatarController";
  import { displayImageUrl, effectiveExpression } from "../../avatar/displayImage";
  import { audioLevel, isReacting, activeVoiceReactions, voiceReactionRule } from "../../audio/audioStore";
  import { project } from "../../project/projectStore";

  export let transparent: boolean = false;
  export let width:  number = 640;
  export let height: number = 480;

  let canvasEl: HTMLCanvasElement;
  let renderer: Renderer2D | null = null;

  const getState = (): FrameInput => {
    const exp  = get(effectiveExpression);
    const rule = get(voiceReactionRule);
    return {
      imageUrl:   get(displayImageUrl),
      view:       get(project).view,
      effects:    get(project).effects,
      state:      get(avatarState),
      audioLevel: get(audioLevel) / 100,
      expression: exp ? { name: exp.name, color: exp.fallbackColor } : null,
      voiceReaction: {
        types:      get(activeVoiceReactions),
        intensity:  rule.intensity,
        isReacting: get(isReacting),
      },
    };
  };

  onMount(() => {
    renderer = new Renderer2D({ canvas: canvasEl, width, height, transparent, getState });
  });
  $: if (renderer) renderer.resize(width, height);
  onDestroy(() => renderer?.destroy());

  // O flash continua como overlay CSS (não é movimento do personagem)
  $: flashOn = $isReacting && $activeVoiceReactions.includes("colorFlash");
</script>

<div class="avatar-stage" class:transparent style="width: {width}px; height: {height}px;">
  <canvas bind:this={canvasEl} />

  {#if flashOn}<div class="flash-overlay"></div>{/if}

  {#if !transparent && $effectiveExpression}
    <div class="exp-badge">
      <span class="exp-dot" style="background:{$effectiveExpression.fallbackColor}"></span>
      {$effectiveExpression.name}
    </div>
  {/if}
</div>

<style>
  .avatar-stage {
    position: relative; display: flex;
    align-items: center; justify-content: center;
    border-radius: var(--radius-md); overflow: hidden;
    background: #0d0d14; border: 1px solid var(--color-border);
  }
  .avatar-stage.transparent { background: transparent; border: none; }
  canvas { display: block; }

  .exp-badge {
    position: absolute; top: 10px; left: 10px; z-index: 5;
    display: flex; align-items: center; gap: 6px;
    background: rgba(20, 15, 15, 0.92); color: var(--color-text-primary);
    border: 1px solid var(--color-accent); border-radius: 999px;
    padding: 5px 12px 5px 8px; font-size: 12px; font-weight: 700;
    pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  }
  .exp-dot { width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(0,0,0,.4); }

  .flash-overlay {
    position: absolute; inset: 0; pointer-events: none; z-index: 4;
    background: var(--color-accent); mix-blend-mode: screen;
    animation: vr-flash 0.3s ease-out infinite;
  }
  @keyframes vr-flash { 0% { opacity: 0; } 30% { opacity: 0.5; } 100% { opacity: 0; } }
</style>