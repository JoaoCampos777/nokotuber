<script lang="ts">
  import SelectControl from "./SelectControl.svelte";
  import {
    characters, saveCurrentAsCharacter, applyCharacter, renameCharacter,
    deleteCharacter, updateCharacterFromCurrent, exportCharacter, importCharacter,
  } from "../../character/characterLibraryStore";
  import {
    startupPrefs, setStartupMode, setDefaultCharacter, clearDefaultCharacter,
    type StartupMode,
  } from "../../character/startupPrefsStore";

  /** Callback opcional para o Editor mostrar toasts. */
  export let toast: (msg: string, type?: "success" | "error" | "info") => void = () => {};

  let newName = "";
  let editingId = "";
  let editName = "";
  let busy = false;

  $: defaultId = $startupPrefs.mode === "specific" ? $startupPrefs.characterId : null;
  $: startMode = $startupPrefs.mode;
  $: charOptions = [
    { value: "", label: "— escolher —" },
    ...$characters.map((c) => ({ value: c.id, label: c.name })),
  ];

  function save() {
    const name = newName.trim();
    if (!name) { toast("Dê um nome ao personagem.", "info"); return; }
    saveCurrentAsCharacter(name);
    newName = "";
    toast(`Personagem "${name}" salvo`, "success");
  }
  function apply(id: string, name: string) {
    if (applyCharacter(id)) toast(`Personagem "${name}" aplicado`, "success");
  }
  function overwrite(id: string, name: string) {
    if (!window.confirm(`Atualizar "${name}" com o avatar atual? As imagens e ajustes atuais substituem os salvos.`)) return;
    if (updateCharacterFromCurrent(id)) toast(`"${name}" atualizado`, "success");
  }
  function startEdit(id: string, name: string) { editingId = id; editName = name; }
  function commitEdit() {
    if (editingId && editName.trim()) renameCharacter(editingId, editName);
    editingId = "";
  }
  function remove(id: string, name: string) {
    if (!window.confirm(`Excluir o personagem "${name}"? Isso não afeta o projeto aberto.`)) return;
    deleteCharacter(id);
    toast(`"${name}" excluído`, "info");
  }
  function toggleDefault(id: string) {
    if (defaultId === id) { clearDefaultCharacter(); toast("Personagem padrão removido", "info"); }
    else { setDefaultCharacter(id); toast("Definido como personagem padrão", "success"); }
  }
  async function doExport(id: string, name: string) {
    busy = true;
    try { const p = await exportCharacter(id); if (p) toast(`Exportado: ${p.split(/[\\/]/).pop()}`, "success"); }
    catch (e: any) { toast(e?.message ?? "Erro ao exportar", "error"); }
    finally { busy = false; }
  }
  async function doImport() {
    busy = true;
    try { const c = await importCharacter(); if (c) toast(`Personagem "${c.name}" importado`, "success"); }
    catch (e: any) { toast(e?.message ?? "Erro ao importar", "error"); }
    finally { busy = false; }
  }
  function pickStartMode(m: StartupMode) { setStartupMode(m); }

  /** Foca (e seleciona) o input de renomear ao aparecer. */
  function focusEl(node: HTMLInputElement) { node.focus(); node.select(); return {}; }
</script>

<div class="cl">
  <p class="cl-intro">Salve o avatar atual como um personagem para reutilizá-lo em outras cenas — sem reconfigurar tudo.</p>

  <div class="cl-save">
    <input class="cl-name" placeholder="Nome do personagem (ex: Noko)" bind:value={newName}
           on:keydown={(e) => e.key === "Enter" && save()} />
    <button class="chip accent" on:click={save}>＋ Salvar</button>
  </div>

  {#if $characters.length === 0}
    <p class="cl-empty">Nenhum personagem salvo ainda.</p>
  {:else}
    <div class="cl-list">
      {#each $characters as c (c.id)}
        <div class="cl-item" class:def={defaultId === c.id}>
          <div class="cl-item-top">
            {#if editingId === c.id}
              <input class="cl-edit" bind:value={editName} use:focusEl
                     on:keydown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") editingId = ""; }}
                     on:blur={commitEdit} />
            {:else}
              <button class="cl-name-btn" title="Aplicar personagem" on:click={() => apply(c.id, c.name)}>
                <span class="cl-nm">{c.name}</span>
                {#if defaultId === c.id}<span class="cl-star" title="Personagem padrão">★</span>{/if}
              </button>
            {/if}
          </div>
          <div class="cl-item-btns">
            <button class="mini accent" on:click={() => apply(c.id, c.name)} title="Carregar este personagem">Aplicar</button>
            <button class="mini" class:on={defaultId === c.id} on:click={() => toggleDefault(c.id)} title="Usar ao iniciar o app">★ Padrão</button>
            <button class="mini" on:click={() => overwrite(c.id, c.name)} title="Salvar o avatar atual por cima deste">⤓ Atualizar</button>
            <button class="mini" on:click={() => startEdit(c.id, c.name)} title="Renomear">✏</button>
            <button class="mini" disabled={busy} on:click={() => doExport(c.id, c.name)} title="Exportar .nokochar">⇪</button>
            <button class="mini danger" on:click={() => remove(c.id, c.name)} title="Excluir">🗑</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <button class="chip full" disabled={busy} on:click={doImport}>⇩ Importar personagem (.nokochar)</button>

  <div class="cl-start">
    <span class="cl-start-lbl">Ao iniciar o Nokotuber:</span>
    <div class="cl-modes">
      <button class="chip" class:on={startMode === "home"}     on:click={() => pickStartMode("home")}>Tela inicial</button>
      <button class="chip" class:on={startMode === "last"}     on:click={() => pickStartMode("last")}>Último personagem</button>
      <button class="chip" class:on={startMode === "specific"} on:click={() => pickStartMode("specific")}>Específico</button>
    </div>
    {#if startMode === "specific"}
      <SelectControl label="Personagem padrão" value={defaultId ?? ""} options={charOptions}
        onChange={(v) => { if (v) setDefaultCharacter(v); else clearDefaultCharacter(); }} />
    {/if}
  </div>
</div>

<style>
  .cl { display: flex; flex-direction: column; gap: 8px; }
  .cl-intro { font-size: 10.5px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }
  .cl-save { display: flex; gap: 5px; }
  .cl-name { flex: 1; min-width: 0; background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 8px; font-size: 11px; font-family: inherit; }
  .cl-empty { font-size: 10px; color: var(--color-text-dim); margin: 0; text-align: center; padding: 6px; }

  .cl-list { display: flex; flex-direction: column; gap: 5px; }
  .cl-item { border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-bg-panel-2); padding: 6px 7px; display: flex; flex-direction: column; gap: 5px; }
  .cl-item.def { border-color: var(--color-accent-dim); }
  .cl-item-top { display: flex; min-width: 0; }
  .cl-name-btn { flex: 1; min-width: 0; display: flex; align-items: center; gap: 5px; background: transparent; border: none; cursor: pointer; font-family: inherit; text-align: left; padding: 0; }
  .cl-nm { font-size: 12px; font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cl-name-btn:hover .cl-nm { color: var(--color-accent); }
  .cl-star { color: var(--color-warning); font-size: 11px; flex-shrink: 0; }
  .cl-edit { flex: 1; min-width: 0; background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-accent-dim); border-radius: var(--radius-sm); padding: 4px 6px; font-size: 12px; font-weight: 600; font-family: inherit; }

  .cl-item-btns { display: flex; gap: 3px; flex-wrap: wrap; }
  .mini { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 3px 6px; font-size: 10px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .mini:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .mini:disabled { opacity: .5; cursor: not-allowed; }
  .mini.accent { color: var(--color-accent); border-color: var(--color-accent-dim); }
  .mini.on { color: var(--color-warning); border-color: var(--color-warning); }
  .mini.danger:hover { background: var(--color-danger); color: #fff; border-color: var(--color-danger); }

  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 8px; font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip:disabled { opacity: .5; cursor: not-allowed; }
  .chip.accent { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
  .chip.full { width: 100%; }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }

  .cl-start { border-top: 1px solid var(--color-border-soft); padding-top: 7px; display: flex; flex-direction: column; gap: 5px; }
  .cl-start-lbl { font-size: 10px; color: var(--color-text-secondary); }
  .cl-modes { display: flex; gap: 4px; flex-wrap: wrap; }
</style>
