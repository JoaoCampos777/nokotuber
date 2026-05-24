<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { Renderer2D, type FrameInput } from "../../renderer/Renderer2D";
  import { currentImageUrl, avatarState } from "../../avatar/avatarController";
  import { audioLevel } from "../../audio/audioStore";
  import { project } from "../../project/projectStore";

  export let transparent: boolean = false;
  export let width:  number = 640;
  export let height: number = 480;

  let canvasEl: HTMLCanvasElement;
  let renderer: Renderer2D | null = null;

  const getState = (): FrameInput => ({
    imageUrl:   get(currentImageUrl),
    view:       get(project).view,
    effects:    get(project).effects,
    state:      get(avatarState),
    audioLevel: get(audioLevel) / 100,
  });

  onMount(() => {
    renderer = new Renderer2D({ canvas: canvasEl, width, height, transparent, getState });
  });

  $: if (renderer) renderer.resize(width, height);

  onDestroy(() => renderer?.destroy());
</script>

<div class="avatar-stage" class:transparent style="width: {width}px; height: {height}px;">
  <canvas bind:this={canvasEl} />
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
</style>