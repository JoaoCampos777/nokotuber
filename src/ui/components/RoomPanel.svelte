<script lang="ts">
  import SliderControl from "./SliderControl.svelte";
  import SelectControl from "./SelectControl.svelte";
  import {
    room, updateParticipant, centerParticipant, resetParticipantTransform,
    setAvatarImage, clearAvatarImage,
  } from "../../room/roomStore";
  import { ROOM_CANVAS } from "../../room/roomTypes";
  import type { ExpressionImageSlot } from "../../project/expressionTypes";
  import { importImageFile } from "../../core/desktop";
  import { setManualSpeaking } from "../../audio/manualSpeakingProvider";
  import ParticipantEffectsControls from "./ParticipantEffectsControls.svelte";
  import CompanionHostPanel from "./CompanionHostPanel.svelte";
  import DiscordBindControls from "./DiscordBindControls.svelte";
  import { audioRouting, setParticipantSource, setMicMode, setMicTarget } from "../../audio/audioBindingStore";
  import type { AudioBindingMode, MicRoomMode } from "../../audio/speakingTypes";

  const imageSlots: { key: ExpressionImageSlot; label: string }[] = [
    { key: "mouthClosed", label: "Boca fechada" },
    { key: "mouthOpen",   label: "Boca aberta" },
    { key: "blinkClosed", label: "Piscar fechada" },
    { key: "blinkOpen",   label: "Piscar aberta" },
  ];
  const sourceOptions = [
    { value: "shared_microphone", label: "Microfone compartilhado" },
    { value: "manual_test",       label: "Teste manual" },
    { value: "remote_companion_user", label: "Companion remoto" },
  ];

  let importing = "";
  async function importFor(avatarId: string, key: ExpressionImageSlot) {
    importing = `${avatarId}:${key}`;
    try { const url = await importImageFile(); if (url) setAvatarImage(avatarId, key, url); }
    finally { importing = ""; }
  }
  function avatarOf(avatarId: string) { return $room.avatars.find((a) => a.id === avatarId); }
  function onName(id: string, e: Event) { updateParticipant(id, { name: (e.target as HTMLInputElement).value }); }
  function sourceOf(id: string): string {
    return $audioRouting.bindings.find((b) => b.participantId === id)?.mode ?? "shared_microphone";
  }
  function onSource(id: string, v: string) { setParticipantSource(id, v as AudioBindingMode); }

  let fxOpen: Record<string, boolean> = {};
  function toggleFx(id: string) { fxOpen = { ...fxOpen, [id]: !fxOpen[id] }; }
  function othersOf(id: string) {
    return $room.participants.filter((x) => x.id !== id).map((x) => ({ value: x.id, label: x.name }));
  }

  $: micTargetOptions = $room.participants.map((p) => ({ value: p.id, label: p.name }));
</script>

<div class="room-panel">
  <!-- ÁUDIO DA SALA -->
  <div class="audio-box">
    <div class="audio-title">Áudio da sala — microfone compartilhado</div>
    <div class="mic-modes">
      <button class="chip" class:on={$audioRouting.micMode === "all"}      on:click={() => setMicMode("all")}>Controla todos</button>
      <button class="chip" class:on={$audioRouting.micMode === "selected"} on:click={() => setMicMode("selected")}>Só o selecionado</button>
      <button class="chip" class:on={$audioRouting.micMode === "off"}      on:click={() => setMicMode("off")}>Desativado</button>
    </div>
    {#if $audioRouting.micMode === "selected"}
      <SelectControl label="Participante do mic" value={$audioRouting.micTargetParticipantId ?? ""}
        options={[{ value: "", label: "— escolher —" }, ...micTargetOptions]}
        onChange={(v) => setMicTarget(v || null)} />
    {/if}
     <CompanionHostPanel />
  </div>

  {#each $room.participants as p (p.id)}
    {@const av = avatarOf(p.avatarId)}
    <div class="part" class:off={!p.enabled}>
      <div class="part-head">
        <input class="part-name" value={p.name} on:input={(e) => onName(p.id, e)} />
        <button class="chip" class:on={p.enabled} on:click={() => updateParticipant(p.id, { enabled: !p.enabled })}>
          {p.enabled ? "● Ativo" : "○ Inativo"}
        </button>
      </div>

      <SelectControl label="Fonte de fala" value={sourceOf(p.id)} options={sourceOptions} onChange={(v) => onSource(p.id, v)} />
      {#if sourceOf(p.id) === "discord_user"}
        <DiscordBindControls participantId={p.id} />
      {/if}

      <div class="img-grid">
        {#each imageSlots as sl}
          {@const url = av?.images?.[sl.key] ?? null}
          <div class="img-slot">
            <button class="img-thumb" title="Importar {sl.label}" on:click={() => av && importFor(av.id, sl.key)}>
              {#if importing === `${av?.id}:${sl.key}`}<span class="ld">…</span>
              {:else if url}<img src={url} alt={sl.label} />
              {:else}<span class="plus">+</span>{/if}
            </button>
            <span class="img-label">{sl.label}</span>
            {#if url}<button class="img-clear" on:click={() => av && clearAvatarImage(av.id, sl.key)}>×</button>{/if}
          </div>
        {/each}
      </div>

      <SliderControl label="Posição X" suffix="px" value={p.position.x} min={0} max={ROOM_CANVAS.width} step={1}
        onChange={(v) => updateParticipant(p.id, { position: { x: v, y: p.position.y } })} />
      <SliderControl label="Posição Y" suffix="px" value={p.position.y} min={0} max={ROOM_CANVAS.height} step={1}
        onChange={(v) => updateParticipant(p.id, { position: { x: p.position.x, y: v } })} />
      <SliderControl label="Escala" suffix="x" value={p.scale} min={0.2} max={3} step={0.05}
        onChange={(v) => updateParticipant(p.id, { scale: v })} />
      <SliderControl label="Rotação" suffix="°" value={p.rotation} min={-45} max={45} step={1}
        onChange={(v) => updateParticipant(p.id, { rotation: v })} />
      <SliderControl label="Opacidade" value={p.opacity} min={0.1} max={1} step={0.05}
        onChange={(v) => updateParticipant(p.id, { opacity: v })} />

      <div class="row">
        <button class="chip" class:on={p.mirrorX} on:click={() => updateParticipant(p.id, { mirrorX: !p.mirrorX })}>⇄ Espelhar</button>
        <button class="chip" on:click={() => centerParticipant(p.id)}>⊕ Centralizar</button>
        <button class="chip" on:click={() => resetParticipantTransform(p.id)}>↺ Resetar</button>
      </div>

      <div class="row">
        <button class="hold-btn"
          on:mousedown={() => setManualSpeaking(p.id, true)}
          on:mouseup={() => setManualSpeaking(p.id, false)}
          on:mouseleave={() => setManualSpeaking(p.id, false)}
          on:touchstart|preventDefault={() => setManualSpeaking(p.id, true)}
          on:touchend={() => setManualSpeaking(p.id, false)}>
          🎤 Segurar p/ falar
        </button>
        <button class="chip" class:on={p.isSpeaking} on:click={() => setManualSpeaking(p.id, !p.isSpeaking)}>
          {p.isSpeaking ? "● Falando" : "○ Simular fala"}
        </button>
      </div>

      <button class="fx-toggle" on:click={() => toggleFx(p.id)}>
        {fxOpen[p.id] ? "▼" : "▶"} Efeitos deste participante
      </button>
      {#if fxOpen[p.id]}
        <ParticipantEffectsControls participantId={p.id} others={othersOf(p.id)} />
      {/if}
    </div>
  {/each}
</div>

<style>
  .room-panel { display: flex; flex-direction: column; gap: 10px; }

  .audio-box { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-bg-panel-2); }
  .audio-title { font-size: 11px; font-weight: 700; color: var(--color-text-secondary); }
  .mic-modes { display: flex; gap: 4px; flex-wrap: wrap; }

  .part { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-bg-panel-2); }
  .part.off { opacity: .55; }
  .part-head { display: flex; gap: 6px; align-items: center; }
  .part-name { flex: 1; background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 8px; font-size: 12px; font-weight: 600; font-family: inherit; }

  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }

  .img-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
  .img-slot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .img-thumb { width: 100%; height: 50px; border: 1px dashed var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0; }
  .img-thumb:hover { border-color: var(--color-accent); }
  .img-thumb img { width: 100%; height: 100%; object-fit: contain; }
  .plus { font-size: 18px; color: var(--color-text-dim); }
  .ld { color: var(--color-text-dim); }
  .img-label { font-size: 8px; color: var(--color-text-dim); }
  .img-clear { position: absolute; top: 1px; right: 1px; width: 16px; height: 16px; border: none; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; cursor: pointer; font-size: 11px; line-height: 1; padding: 0; }
  .img-clear:hover { background: var(--color-danger); }

  .row { display: flex; gap: 4px; flex-wrap: wrap; }
  .hold-btn { flex: 1; background: var(--color-accent-soft); color: var(--color-accent-hover); border: 1px solid var(--color-accent-dim); border-radius: var(--radius-sm); padding: 6px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; user-select: none; }
  .hold-btn:active { background: var(--color-accent); color: #fff; }
  .fx-toggle { text-align: left; background: transparent; color: var(--color-text-secondary); border: 1px dashed var(--color-border); border-radius: var(--radius-sm); padding: 6px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .fx-toggle:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
</style>