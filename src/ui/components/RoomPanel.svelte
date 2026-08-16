<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import SliderControl from "./SliderControl.svelte";
  import SelectControl from "./SelectControl.svelte";
  import SectionAccordion from "./SectionAccordion.svelte";
  import RoomQuickStart from "./RoomQuickStart.svelte";
  import {
    room, updateParticipant, centerParticipant, resetParticipantTransform,
    setAvatarImage, clearAvatarImage, addParticipant, removeParticipant, moveParticipantLayer,
    addRoomAddon, removeRoomAddon, updateRoomAddon,
    updateAvatarMouth, setAvatarVisemeImage, clearAvatarVisemeImage,
  } from "../../room/roomStore";
  import { ROOM_CANVAS, ROOM_MAX_FUTURE } from "../../room/roomTypes";
  import type { ExpressionImageSlot } from "../../project/expressionTypes";
  import { importImageFile } from "../../core/desktop";
  import { setManualSpeaking } from "../../audio/manualSpeakingProvider";
  import ParticipantEffectsControls from "./ParticipantEffectsControls.svelte";
  import RoomExpressionsControls from "./RoomExpressionsControls.svelte";
  import AddonControls from "./AddonControls.svelte";
  import MouthControls from "./MouthControls.svelte";
  import CompanionHostPanel from "./CompanionHostPanel.svelte";
  import { defaultMouthConfig } from "../../mouth/mouthTypes";
  import DiscordBindControls from "./DiscordBindControls.svelte";
  import { audioRouting, setParticipantSource, setMicMode, setMicTarget } from "../../audio/audioBindingStore";
  import type { AudioBindingMode } from "../../audio/speakingTypes";
  import { uiPrefs } from "../uiPrefsStore";

  const imageSlots: { key: ExpressionImageSlot; label: string }[] = [
    { key: "mouthClosed", label: "Boca fechada" },
    { key: "mouthOpen",   label: "Boca aberta" },
    { key: "blinkClosed", label: "Piscar fechada" },
    { key: "blinkOpen",   label: "Piscar aberta" },
  ];
  const sourceOptions = [
    { value: "shared_microphone", label: "Microfone do Host" },
    { value: "manual_test",       label: "Controle manual" },
    { value: "remote_companion_user", label: "Companion" },
  ];
  const sourceLabel: Record<string, string> = {
    shared_microphone: "Microfone do Host", manual_test: "Controle manual", remote_companion_user: "Companion",
  };

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

  // Acordeão de participante: só um expandido por vez (menos poluição visual).
  let expandedId = "";
  onMount(() => { const ps = get(room).participants; if (ps[0]) expandedId = ps[0].id; });
  function toggleParticipant(id: string) { expandedId = expandedId === id ? "" : id; }

  function handleAdd() { const id = addParticipant(); if (id) expandedId = id; }
  function handleRemove(id: string, name: string) {
    if (window.confirm(`Remover "${name}" da sala? As imagens e ajustes dele são perdidos.`)) {
      if (expandedId === id) expandedId = "";
      removeParticipant(id);
    }
  }
  $: atLimit = $room.participants.length >= ROOM_MAX_FUTURE;

  let fxOpen: Record<string, boolean> = {};
  function toggleFx(id: string) { fxOpen = { ...fxOpen, [id]: !fxOpen[id] }; }
  let exOpen: Record<string, boolean> = {};
  function toggleEx(id: string) { exOpen = { ...exOpen, [id]: !exOpen[id] }; }
  let adOpen: Record<string, boolean> = {};
  function toggleAd(id: string) { adOpen = { ...adOpen, [id]: !adOpen[id] }; }
  let moOpen: Record<string, boolean> = {};
  function toggleMo(id: string) { moOpen = { ...moOpen, [id]: !moOpen[id] }; }
  function othersOf(id: string) {
    return $room.participants.filter((x) => x.id !== id).map((x) => ({ value: x.id, label: x.name }));
  }
  function statusOf(p: any): { label: string; cls: string } {
    if (!p.enabled) return { label: "inativo", cls: "off" };
    if (p.isSpeaking) return { label: "falando", cls: "talking" };
    return { label: "silêncio", cls: "idle" };
  }

  $: micTargetOptions = $room.participants.map((p) => ({ value: p.id, label: p.name }));
  $: advanced = $uiPrefs.mode === "advanced";
</script>

<div class="room-panel">
  <div data-tour="room-block"><RoomQuickStart /></div>

  <!-- MICROFONE -->
  <SectionAccordion title="Microfone" storageKey="room-mic">
    <div class="block">
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
    </div>
  </SectionAccordion>

  <!-- SALA E COMPANIONS (host: código, servidor, endereço, remotos) -->
  <SectionAccordion title="Sala e Companions" storageKey="room-host">
    <CompanionHostPanel />
  </SectionAccordion>

  <!-- PARTICIPANTES (personagens do palco) -->
  <div data-tour="participants">
  <SectionAccordion title="Participantes" storageKey="room-parts" badge={`${$room.participants.length} / ${ROOM_MAX_FUTURE}`}>
    <div class="parts">
      <div class="parts-head">
        {#if atLimit}
          <span class="parts-limit">Limite de {ROOM_MAX_FUTURE} participantes atingido.</span>
        {:else}
          <button class="chip accent full" on:click={handleAdd}>＋ Adicionar participante</button>
        {/if}
      </div>
      {#each $room.participants as p (p.id)}
        {@const av = avatarOf(p.avatarId)}
        {@const st = statusOf(p)}
        {@const isOpen = expandedId === p.id}
        <div class="part" class:off={!p.enabled}>
          <button class="part-bar" on:click={() => toggleParticipant(p.id)} aria-expanded={isOpen}>
            <span class="caret">{isOpen ? "▾" : "▸"}</span>
            <span class="pname">{p.name}</span>
            <span class="pdot {st.cls}">{st.label}</span>
            <span class="psrc">{sourceLabel[sourceOf(p.id)] ?? ""}</span>
          </button>

          {#if isOpen}
            <div class="part-body">
              <div class="part-head">
                <input class="part-name" value={p.name} on:input={(e) => onName(p.id, e)} />
                <button class="chip" class:on={p.enabled} on:click={() => updateParticipant(p.id, { enabled: !p.enabled })}>
                  {p.enabled ? "● Ativo" : "○ Inativo"}
                </button>
              </div>

              <SelectControl label="Controle de voz" value={sourceOf(p.id)} options={sourceOptions} onChange={(v) => onSource(p.id, v)} />
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
              {#if advanced}
                <SliderControl label="Rotação" suffix="°" value={p.rotation} min={-45} max={45} step={1}
                  onChange={(v) => updateParticipant(p.id, { rotation: v })} />
                <SliderControl label="Opacidade" value={p.opacity} min={0.1} max={1} step={0.05}
                  onChange={(v) => updateParticipant(p.id, { opacity: v })} />
              {/if}

              <div class="row">
                {#if advanced}
                  <button class="chip" class:on={p.mirrorX} on:click={() => updateParticipant(p.id, { mirrorX: !p.mirrorX })}>⇄ Espelhar</button>
                {/if}
                <button class="chip" on:click={() => centerParticipant(p.id)}>⊕ Centralizar</button>
                <button class="chip" on:click={() => resetParticipantTransform(p.id)}>↺ Resetar</button>
              </div>

              <div class="row">
                {#if advanced}
                  <button class="chip" on:click={() => moveParticipantLayer(p.id, 1)} title="Trazer para frente">⬆ Camada</button>
                  <button class="chip" on:click={() => moveParticipantLayer(p.id, -1)} title="Enviar para trás">⬇ Camada</button>
                {/if}
                <button class="chip danger" disabled={$room.participants.length <= 1} on:click={() => handleRemove(p.id, p.name)}>🗑 Remover</button>
              </div>

              <div class="row">
                <button class="hold-btn"
                  on:mousedown={() => setManualSpeaking(p.id, true)}
                  on:mouseup={() => setManualSpeaking(p.id, false)}
                  on:mouseleave={() => setManualSpeaking(p.id, false)}
                  on:touchstart|preventDefault={() => setManualSpeaking(p.id, true)}
                  on:touchend={() => setManualSpeaking(p.id, false)}>
                  🎤 Falar ao segurar
                </button>
                <button class="chip" class:on={p.isSpeaking} on:click={() => setManualSpeaking(p.id, !p.isSpeaking)}>
                  {p.isSpeaking ? "● Falando" : "○ Testar fala"}
                </button>
              </div>

              {#if advanced}
                <button class="fx-toggle" on:click={() => toggleFx(p.id)}>
                  {fxOpen[p.id] ? "▼" : "▶"} Efeitos e reação de voz
                </button>
                {#if fxOpen[p.id]}
                  <ParticipantEffectsControls participantId={p.id} others={othersOf(p.id)} />
                {/if}
                <button class="fx-toggle" on:click={() => toggleEx(p.id)}>
                  {exOpen[p.id] ? "▼" : "▶"} Expressões (faces) e grito
                </button>
                {#if exOpen[p.id]}
                  <RoomExpressionsControls participantId={p.id} avatarId={p.avatarId} />
                {/if}
                <button class="fx-toggle" on:click={() => toggleAd(p.id)}>
                  {adOpen[p.id] ? "▼" : "▶"} Acessórios
                </button>
                {#if adOpen[p.id]}
                  <AddonControls addons={av?.addons ?? []}
                    onAdd={() => addRoomAddon(p.avatarId)}
                    onRemove={(id) => removeRoomAddon(p.avatarId, id)}
                    onUpdate={(id, patch) => updateRoomAddon(p.avatarId, id, patch)} />
                {/if}
                <button class="fx-toggle" on:click={() => toggleMo(p.id)}>
                  {moOpen[p.id] ? "▼" : "▶"} Boca / Visemas
                </button>
                {#if moOpen[p.id]}
                  <MouthControls mouth={av?.mouth ?? defaultMouthConfig()}
                    onUpdate={(patch) => updateAvatarMouth(p.avatarId, patch)}
                    onSetImage={(v, url) => setAvatarVisemeImage(p.avatarId, v, url)}
                    onClearImage={(v) => clearAvatarVisemeImage(p.avatarId, v)} />
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </SectionAccordion>
  </div>
</div>

<style>
  .room-panel { box-sizing: border-box; width: 100%; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
  .room-panel :global(*) { box-sizing: border-box; }
  .block { display: flex; flex-direction: column; gap: 6px; }
  .mic-modes { display: flex; gap: 4px; flex-wrap: wrap; }

  .parts { display: flex; flex-direction: column; gap: 6px; }
  .part { min-width: 0; border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-bg-panel-2); overflow: hidden; }
  .part.off { opacity: .6; }
  .part-bar { display: flex; align-items: center; gap: 6px; width: 100%; padding: 7px 9px; background: transparent; border: none; cursor: pointer; font-family: inherit; text-align: left; }
  .part-bar:hover { background: var(--color-bg-hover); }
  .caret { color: var(--color-text-dim); font-size: 10px; width: 10px; flex-shrink: 0; }
  .pname { font-size: 12px; font-weight: 600; color: var(--color-text-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pdot { font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 999px; flex-shrink: 0; }
  .pdot.talking { color: var(--color-accent); background: var(--color-accent-soft); }
  .pdot.idle { color: var(--color-text-dim); background: var(--color-bg-secondary); }
  .pdot.off { color: var(--color-text-dim); background: transparent; border: 1px solid var(--color-border-soft); }
  .psrc { font-size: 9px; color: var(--color-text-dim); flex-shrink: 0; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .part-body { display: flex; flex-direction: column; gap: 6px; padding: 8px; border-top: 1px solid var(--color-border-soft); }
  .part-head { display: flex; gap: 6px; align-items: center; }
  .part-name { flex: 1; min-width: 0; background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 8px; font-size: 12px; font-weight: 600; font-family: inherit; }

  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip:disabled { opacity: .45; cursor: not-allowed; }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }
  .chip.accent { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
  .chip.accent:hover { background: var(--color-accent-hover); color: #fff; }
  .chip.full { width: 100%; }
  .chip.danger { color: var(--color-danger); border-color: var(--color-danger); }
  .chip.danger:hover:not(:disabled) { background: var(--color-danger); color: #fff; }

  .parts-head { margin-bottom: 2px; }
  .parts-limit { font-size: 10px; color: var(--color-warning); text-align: center; display: block; padding: 5px; border: 1px dashed var(--color-border-soft); border-radius: var(--radius-sm); }

  .img-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
  .img-slot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; }
  .img-thumb { width: 100%; height: 50px; border: 1px dashed var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0; }
  .img-thumb:hover { border-color: var(--color-accent); }
  .img-thumb img { width: 100%; height: 100%; object-fit: contain; }
  .plus { font-size: 18px; color: var(--color-text-dim); }
  .ld { color: var(--color-text-dim); }
  .img-label { font-size: 8px; color: var(--color-text-dim); }
  .img-clear { position: absolute; top: 1px; right: 1px; width: 16px; height: 16px; border: none; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; cursor: pointer; font-size: 11px; line-height: 1; padding: 0; }
  .img-clear:hover { background: var(--color-danger); }

  .row { display: flex; gap: 4px; flex-wrap: wrap; }
  .hold-btn { flex: 1; min-width: 120px; background: var(--color-accent-soft); color: var(--color-accent-hover); border: 1px solid var(--color-accent-dim); border-radius: var(--radius-sm); padding: 6px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; user-select: none; }
  .hold-btn:active { background: var(--color-accent); color: #fff; }
  .fx-toggle { text-align: left; background: transparent; color: var(--color-text-secondary); border: 1px dashed var(--color-border); border-radius: var(--radius-sm); padding: 6px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .fx-toggle:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
</style>
