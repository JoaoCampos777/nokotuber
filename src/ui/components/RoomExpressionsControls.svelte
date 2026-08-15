<script lang="ts">
  import SelectControl from "./SelectControl.svelte";
  import SliderControl from "./SliderControl.svelte";
  import {
    room, addRoomExpression, removeRoomExpression, renameRoomExpression,
    setRoomExpressionImage, clearRoomExpressionImage, setActiveRoomExpression, setShoutExpression,
    setRoomExpressionHotkey,
  } from "../../room/roomStore";
  import { participantEffects, updateVoiceReaction } from "../../effects/participantEffectsStore";
  import { simulateParticipantReaction } from "../../companion/companionHostSync";
  import { importImageFile } from "../../core/desktop";
  import type { ExpressionImageSlot } from "../../project/expressionTypes";
  import { SUGGESTED_HOTKEYS } from "../../project/expressionTypes";

  export let participantId: string;
  export let avatarId: string;

  const slots: { key: ExpressionImageSlot; label: string }[] = [
    { key: "mouthClosed", label: "Fechada" },
    { key: "mouthOpen",   label: "Aberta" },
    { key: "blinkClosed", label: "Pisc. fech." },
    { key: "blinkOpen",   label: "Pisc. aber." },
  ];

  $: avatar = $room.avatars.find((a) => a.id === avatarId);
  $: expressions = avatar?.expressions ?? [];
  $: activeId = avatar?.activeExpressionId ?? null;
  $: shoutId = avatar?.shoutExpressionId ?? null;
  $: vr = $participantEffects.find((e) => e.participantId === participantId)?.voiceReaction;
  $: shoutOptions = [{ value: "", label: "— nenhuma —" }, ...expressions.map((e) => ({ value: e.id, label: e.name }))];

  let importing = "";
  let editingId = "";
  let editName = "";

  async function importFor(expId: string, key: ExpressionImageSlot) {
    importing = `${expId}:${key}`;
    try { const url = await importImageFile(); if (url) setRoomExpressionImage(avatarId, expId, key, url); }
    finally { importing = ""; }
  }
  function add() { addRoomExpression(avatarId, `Expressão ${expressions.length + 1}`); }
  function onHotkey(expId: string, ev: Event) {
    setRoomExpressionHotkey(avatarId, expId, (ev.target as HTMLSelectElement).value || null);
  }
  function startEdit(id: string, name: string) { editingId = id; editName = name; }
  function commitEdit() { if (editingId && editName.trim()) renameRoomExpression(avatarId, editingId, editName); editingId = ""; }
  function focusEl(node: HTMLInputElement) { node.focus(); node.select(); return {}; }
</script>

<div class="rx">
  <p class="rx-intro">Faces extras deste personagem. A <b>ativa</b> aparece normalmente; a de <b>grito</b> aparece quando ele fala alto.</p>

  <div class="rx-active">
    <span class="rx-lbl">Face ativa:</span>
    <div class="rx-chips">
      <button class="chip" class:on={!activeId} on:click={() => setActiveRoomExpression(avatarId, null)}>Neutro</button>
      {#each expressions as e (e.id)}
        <button class="chip" class:on={activeId === e.id} on:click={() => setActiveRoomExpression(avatarId, e.id)}>{e.name}</button>
      {/each}
    </div>
  </div>

  {#if expressions.length === 0}
    <p class="rx-empty">Nenhuma expressão ainda. Adicione uma face (ex.: Bravo, Surpreso).</p>
  {:else}
    <div class="rx-list">
      {#each expressions as e (e.id)}
        <div class="rx-item" class:shout={shoutId === e.id}>
          <div class="rx-item-top">
            {#if editingId === e.id}
              <input class="rx-edit" bind:value={editName} use:focusEl
                on:keydown={(ev) => { if (ev.key === "Enter") commitEdit(); if (ev.key === "Escape") editingId = ""; }}
                on:blur={commitEdit} />
            {:else}
              <button class="rx-name" on:click={() => startEdit(e.id, e.name)} title="Renomear">{e.name}</button>
            {/if}
            <select class="rx-key" title="Atalho de teclado" value={e.hotkey ?? ""} on:change={(ev) => onHotkey(e.id, ev)}>
              <option value="">⌨ —</option>
              {#each SUGGESTED_HOTKEYS as h}<option value={h.code}>{h.label}</option>{/each}
            </select>
            <button class="mini danger" on:click={() => removeRoomExpression(avatarId, e.id)} title="Remover">🗑</button>
          </div>
          <div class="rx-imgs">
            {#each slots as sl}
              {@const url = e.images?.[sl.key] ?? null}
              <div class="rx-slot">
                <button class="rx-thumb" title="Importar {sl.label}" on:click={() => importFor(e.id, sl.key)}>
                  {#if importing === `${e.id}:${sl.key}`}<span class="ld">…</span>
                  {:else if url}<img src={url} alt={sl.label} />
                  {:else}<span class="plus">+</span>{/if}
                </button>
                <span class="rx-slbl">{sl.label}</span>
                {#if url}<button class="rx-clear" on:click={() => clearRoomExpressionImage(avatarId, e.id, sl.key)}>×</button>{/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <button class="chip full" on:click={add}>＋ Adicionar expressão</button>

  <div class="rx-shout">
    <span class="rx-lbl">Ao gritar:</span>
    <SelectControl label="Expressão de grito" value={shoutId ?? ""} options={shoutOptions}
      onChange={(v) => setShoutExpression(avatarId, v || null)} />
    {#if shoutId}
      <SliderControl label="Volume para gritar" value={vr?.shoutThreshold ?? 70} min={0} max={100} step={1}
        tooltip="Acima deste volume, troca para a expressão de grito."
        onChange={(v) => updateVoiceReaction(participantId, { shoutThreshold: v })} />
      <button class="chip full" on:click={() => simulateParticipantReaction(participantId)}>▶ Testar grito</button>
    {/if}
  </div>
</div>

<style>
  .rx { display: flex; flex-direction: column; gap: 6px; }
  .rx-intro { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }
  .rx-lbl { font-size: 10px; font-weight: 700; color: var(--color-text-secondary); }
  .rx-active { display: flex; flex-direction: column; gap: 4px; }
  .rx-chips { display: flex; gap: 4px; flex-wrap: wrap; }
  .rx-empty { font-size: 10px; color: var(--color-text-dim); margin: 0; text-align: center; }

  .rx-list { display: flex; flex-direction: column; gap: 5px; }
  .rx-item { border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); padding: 5px 6px; display: flex; flex-direction: column; gap: 4px; }
  .rx-item.shout { border-color: var(--color-accent-dim); }
  .rx-item-top { display: flex; align-items: center; gap: 6px; }
  .rx-name { flex: 1; min-width: 0; text-align: left; background: transparent; border: none; color: var(--color-text-primary); font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rx-name:hover { color: var(--color-accent); }
  .rx-edit { flex: 1; min-width: 0; background: var(--color-bg-panel-2); color: var(--color-text-primary); border: 1px solid var(--color-accent-dim); border-radius: var(--radius-sm); padding: 3px 5px; font-size: 11px; font-weight: 600; font-family: inherit; }
  .rx-key { flex-shrink: 0; background: var(--color-bg-panel-2); color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); font-size: 10px; padding: 2px 3px; font-family: inherit; cursor: pointer; }

  .rx-imgs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; }
  .rx-slot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 0; }
  .rx-thumb { width: 100%; height: 38px; border: 1px dashed var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-panel-2); cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0; }
  .rx-thumb:hover { border-color: var(--color-accent); }
  .rx-thumb img { width: 100%; height: 100%; object-fit: contain; }
  .plus { font-size: 15px; color: var(--color-text-dim); }
  .ld { color: var(--color-text-dim); }
  .rx-slbl { font-size: 7px; color: var(--color-text-dim); }
  .rx-clear { position: absolute; top: 0; right: 0; width: 14px; height: 14px; border: none; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; cursor: pointer; font-size: 10px; line-height: 1; padding: 0; }
  .rx-clear:hover { background: var(--color-danger); }

  .rx-shout { border-top: 1px solid var(--color-border-soft); padding-top: 6px; display: flex; flex-direction: column; gap: 5px; }

  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }
  .chip.full { width: 100%; }
  .mini { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 2px 6px; font-size: 10px; cursor: pointer; font-family: inherit; }
  .mini.danger:hover { background: var(--color-danger); color: #fff; border-color: var(--color-danger); }
</style>
