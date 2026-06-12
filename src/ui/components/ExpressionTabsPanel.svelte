<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    expressionState, activeSet, activeExpression, hotkeyConflicts,
    createSet, renameSet, removeSet, setActiveSet,
    setActiveExpression, addExpression, removeExpression,
    renameExpression, updateExpressionHotkey,
    setExpressionImage, clearExpressionImage,
  } from "../../project/expressionStore";
  import { setHotkeyCapturing } from "../../hotkeys/hotkeyManager";
  import { hotkeyLabel, type ExpressionImageSlot } from "../../project/expressionTypes";
  import { importImageFile } from "../../core/desktop";

  let recordingExpId: string | null = null;

  function startRecording(expId: string) {
    recordingExpId = expId;
    setHotkeyCapturing(true);
    window.addEventListener("keydown", onRecordKey, true);
  }
  function onRecordKey(e: KeyboardEvent) {
    e.preventDefault(); e.stopPropagation();
    if (e.key !== "Escape" && recordingExpId) updateExpressionHotkey(recordingExpId, e.code);
    cancelRecording();
  }
  function cancelRecording() {
    recordingExpId = null;
    setHotkeyCapturing(false);
    window.removeEventListener("keydown", onRecordKey, true);
  }
  onDestroy(cancelRecording);

  function onSetName(id: string, e: Event) { renameSet(id, (e.target as HTMLInputElement).value); }
  function onExpName(id: string, e: Event) { renameExpression(id, (e.target as HTMLInputElement).value); }

  const imageSlots: { key: ExpressionImageSlot; label: string }[] = [
    { key: "mouthClosed", label: "Boca fechada" },
    { key: "mouthOpen",   label: "Boca aberta" },
    { key: "blinkClosed", label: "Piscar fechada" },
    { key: "blinkOpen",   label: "Piscar aberta" },
  ];

  let importingKey: ExpressionImageSlot | null = null;
  async function importFor(expId: string, key: ExpressionImageSlot) {
    importingKey = key;
    try {
      const url = await importImageFile();
      if (url) setExpressionImage(expId, key, url);
    } finally { importingKey = null; }
  }
</script>

<div class="ex-panel">
  <div class="tabs">
    {#each $expressionState.sets as set (set.id)}
      <button class="tab" class:active={set.id === $expressionState.activeSetId}
              on:click={() => setActiveSet(set.id)}>{set.name}</button>
    {/each}
    <button class="tab add" title="Nova aba" on:click={() => createSet()}>+</button>
  </div>

  {#if $activeSet}
    <div class="set-head">
      <input class="set-name" value={$activeSet.name} on:input={(e) => onSetName($activeSet.id, e)} />
      <button class="mini del" title="Remover aba" disabled={$expressionState.sets.length <= 1}
              on:click={() => removeSet($activeSet.id)}>✕</button>
    </div>

    <div class="exps">
      {#each $activeSet.expressions as exp (exp.id)}
        <div class="exp" class:active={exp.id === $activeExpression?.id}>
          <button class="dot" style="background:{exp.fallbackColor}" title="Ativar"
                  on:click={() => setActiveExpression(exp.id)}></button>
          <input class="exp-name" value={exp.name} on:input={(e) => onExpName(exp.id, e)} />
          <div class="hk">
            {#if recordingExpId === exp.id}
              <button class="key recording" on:click={cancelRecording}>pressione…</button>
            {:else}
              <button class="key" class:conflict={$hotkeyConflicts.has(exp.id)}
                      title="Clique e pressione a tecla" on:click={() => startRecording(exp.id)}>
                {hotkeyLabel(exp.hotkey)}
              </button>
            {/if}
            {#if exp.hotkey}
              <button class="mini" title="Limpar atalho" on:click={() => updateExpressionHotkey(exp.id, null)}>⌫</button>
            {/if}
          </div>
          <button class="mini del" title="Remover expressão" disabled={$activeSet.expressions.length <= 1}
                  on:click={() => removeExpression($activeSet.id, exp.id)}>✕</button>
        </div>
      {/each}
      <button class="add-exp" on:click={() => addExpression($activeSet.id)}>+ Adicionar expressão</button>
    </div>

    {#if $activeExpression}
      <div class="img-section">
        <div class="img-title">Imagens de "{$activeExpression.name}"</div>
        <div class="img-grid">
          {#each imageSlots as sl}
            {@const url = $activeExpression.images?.[sl.key] ?? null}
            <div class="img-slot">
              <button class="img-thumb" title="Importar {sl.label}" on:click={() => importFor($activeExpression.id, sl.key)}>
                {#if importingKey === sl.key}<span class="ld">…</span>
                {:else if url}<img src={url} alt={sl.label} />
                {:else}<span class="plus">+</span>{/if}
              </button>
              <span class="img-label">{sl.label}</span>
              {#if url}
                <button class="img-clear" title="Remover" on:click={() => clearExpressionImage($activeExpression.id, sl.key)}>×</button>
              {/if}
            </div>
          {/each}
        </div>
        <p class="img-hint">Importe as 4 imagens desta expressão. Trocar de expressão troca este conjunto. Sem imagem, usa o avatar padrão.</p>
      </div>
    {/if}

    {#if [...$hotkeyConflicts].some((id) => $activeSet.expressions.find((e) => e.id === id))}
      <div class="warn">⚠ Há atalhos repetidos nesta aba.</div>
    {/if}

    <p class="hint">As hotkeys são <b>customizáveis</b>: clique no atalho e pressione a tecla. Evita conflito com OBS, jogos, Discord etc.</p>
  {/if}
</div>

<style>
  .ex-panel { display: flex; flex-direction: column; gap: 8px; }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; }
  .tab { background: var(--color-bg-panel-2); color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 10px; font-size: 12px; cursor: pointer; font-family: inherit; }
  .tab:hover { background: var(--color-bg-hover); }
  .tab.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
  .tab.add { font-weight: 700; }

  .set-head { display: flex; gap: 6px; align-items: center; }
  .set-name { flex: 1; background: var(--color-bg-panel-2); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 8px; font-size: 12px; font-weight: 600; font-family: inherit; }

  .exps { display: flex; flex-direction: column; gap: 4px; }
  .exp { display: flex; align-items: center; gap: 6px; padding: 4px; border: 1px solid transparent; border-radius: var(--radius-sm); }
  .exp.active { border-color: var(--color-accent); background: var(--color-accent-soft); }
  .dot { width: 18px; height: 18px; border-radius: 50%; border: 1px solid rgba(0,0,0,.4); cursor: pointer; flex-shrink: 0; }
  .exp-name { flex: 1; background: transparent; color: var(--color-text-primary); border: 1px solid transparent; border-radius: var(--radius-sm); padding: 3px 6px; font-size: 12px; font-family: inherit; }
  .exp-name:hover, .exp-name:focus { border-color: var(--color-border-soft); background: var(--color-bg-panel-2); outline: none; }

  .hk { display: flex; gap: 3px; align-items: center; }
  .key { min-width: 38px; background: var(--color-bg-panel-2); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 3px 7px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .key:hover { border-color: var(--color-accent); }
  .key.recording { color: var(--color-warning); border-color: var(--color-warning); }
  .key.conflict { border-color: var(--color-danger); color: var(--color-danger); }

  .mini { background: transparent; color: var(--color-text-dim); border: none; cursor: pointer; font-size: 12px; padding: 2px 4px; border-radius: var(--radius-sm); }
  .mini:hover:not(:disabled) { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .mini:disabled { opacity: .3; cursor: not-allowed; }
  .mini.del:hover:not(:disabled) { color: var(--color-danger); }

  .add-exp { margin-top: 2px; background: transparent; color: var(--color-accent); border: 1px dashed var(--color-border); border-radius: var(--radius-sm); padding: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
  .add-exp:hover { background: var(--color-accent-soft); }

  .img-section { border-top: 1px solid var(--color-border-soft); padding-top: 8px; }
  .img-title { font-size: 11px; font-weight: 700; color: var(--color-text-secondary); margin-bottom: 6px; }
  .img-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .img-slot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .img-thumb { width: 100%; height: 56px; border: 1px dashed var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0; }
  .img-thumb:hover { border-color: var(--color-accent); }
  .img-thumb img { width: 100%; height: 100%; object-fit: contain; }
  .plus { font-size: 20px; color: var(--color-text-dim); }
  .ld { color: var(--color-text-dim); }
  .img-label { font-size: 9px; color: var(--color-text-dim); }
  .img-clear { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border: none; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; cursor: pointer; font-size: 12px; line-height: 1; padding: 0; }
  .img-clear:hover { background: var(--color-danger); }
  .img-hint { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; margin: 6px 0 0; }

  .warn { font-size: 11px; color: var(--color-danger); background: var(--color-accent-soft); border-radius: var(--radius-sm); padding: 6px 8px; }
  .hint { font-size: 11px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }
</style>