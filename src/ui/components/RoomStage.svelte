<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { RoomRenderer2D, type RoomFrameInput } from "../../renderer/RoomRenderer2D";
  import { room, visibleParticipants } from "../../room/roomStore";
  import { project } from "../../project/projectStore";
  import { participantEffects } from "../../effects/participantEffectsStore";
  import { activeRoomReactions } from "../../room/roomReactions";

  export let transparent: boolean = false;
  export let width:  number = 960;
  export let height: number = 540;

  let canvasEl: HTMLCanvasElement;
  let renderer: RoomRenderer2D | null = null;

  const getState = (): RoomFrameInput => {
    const r = get(room);
    const avatars: Record<string, any> = {};
    for (const a of r.avatars) avatars[a.id] = a;
    const view = get(project).view;
    const effects: Record<string, any> = {};
    for (const e of get(participantEffects)) effects[e.participantId] = e;
    return {
      participants: get(visibleParticipants),
      avatars,
      effects,
      reactions: get(activeRoomReactions),
      background: { mode: view.backgroundMode ?? "transparent", color: view.backgroundColor ?? "#00FF00" },
    };

  };

  onMount(() => {
    renderer = new RoomRenderer2D({ canvas: canvasEl, width, height, transparent, getState });
  });
  $: if (renderer) renderer.resize(width, height);
  onDestroy(() => renderer?.destroy());
</script>

<div class="room-stage" class:transparent style="width: {width}px; height: {height}px;">
  <canvas bind:this={canvasEl} />
</div>

<style>
  .room-stage {
    position: relative; display: flex; align-items: center; justify-content: center;
    border-radius: var(--radius-md); overflow: hidden;
    background: #0d0d14; border: 1px solid var(--color-border);
  }
  .room-stage.transparent { background: transparent; border: none; }
  canvas { display: block; }
</style>