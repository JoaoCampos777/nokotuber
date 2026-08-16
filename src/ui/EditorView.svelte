<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import AvatarStage from "./components/AvatarStage.svelte";
  import AboutModal from "./components/AboutModal.svelte";
  import ViewSettingsPanel from "./panels/ViewSettingsPanel.svelte";
  import EffectsPanel from "./panels/EffectsPanel.svelte";
  import ExpressionTabsPanel from "./components/ExpressionTabsPanel.svelte";
  import VoiceReactionSettings from "./components/VoiceReactionSettings.svelte";
  import MicrophoneSettings from "./components/MicrophoneSettings.svelte";
  import RoomStage from "./components/RoomStage.svelte";
  import SimpleAdvancedToggle from "./components/SimpleAdvancedToggle.svelte";
  import OnboardingTour from "./components/OnboardingTour.svelte";
  import SectionAccordion from "./components/SectionAccordion.svelte";
  import CharacterLibraryPanel from "./components/CharacterLibraryPanel.svelte";
  import AddonControls from "./components/AddonControls.svelte";
  import MouthControls from "./components/MouthControls.svelte";
  import StorePanel from "./components/StorePanel.svelte";
  import { openStore } from "../store/storeUi";
  import { characters, applyCharacter, getCharacter } from "../character/characterLibraryStore";
  import { resolveStartupCharacterId } from "../character/startupPrefsStore";
  import { uiPrefs } from "./uiPrefsStore";
  import { openTourMenu, startTour, tourSeen } from "./tourStore";
  import { TOUR_FIRST } from "./tours";
  import { room, toggleRoomMode } from "../room/roomStore";
  import RoomPanel from "./components/RoomPanel.svelte";
  import { startSharedMicProvider } from "../audio/sharedMicrophoneProvider";
  import { participantEffects } from "../effects/participantEffectsStore";
  import { collectProjectFile, loadProjectFile, resetProjectFile } from "../project/projectPersistence";
  import {
    togglePerformanceWindow, getAppVersion, isTauriEnv, importImageFile,
    saveProjectAs, saveProjectAtPath, openProjectFile, exportProjectZip,
  } from "../core/desktop";
  import {
    project, isDirty, currentProjectPath,
    setImage, clearImage, updateBlinkConfig,
    newProject, toggleDefaultAvatar, loadProject, type ImageSlot,
    addProjectAddon, removeProjectAddon, updateProjectAddon,
    updateMouth, setVisemeImage, clearVisemeImage,
  } from "../project/projectStore";
  import { audioLevel, isTalking, audioThreshold, isAudioActive, startAudioCapture, stopAudioCapture, simulateReaction, voiceReactionRule, isReacting, activeVoiceReactions } from "../audio/audioStore";
  import { avatarState, currentImageUrl, startAvatarController } from "../avatar/avatarController";
  import { emit, listen } from "@tauri-apps/api/event";
  import { get } from "svelte/store";
  import { APP_NAME } from "../config/brand";
  import { APP_ICON_URL, DEFAULT_AVATAR } from "../config/defaultAvatar";
  import { initHotkeyManager } from "../hotkeys/hotkeyManager";
  import { expressionState } from "../project/expressionStore";

  let appVersion    = "0.1.0";
  let openingPerf   = false;
  let perfOpen      = false;
  let importingSlot: ImageSlot | null = null;
  let showAbout     = false;
  let leftTab: "avatar" | "visual" | "expr" | "sala" = "avatar";
  let stopController: (() => void) | null = null;
  let stopHotkeys:    (() => void) | null = null;
  let stopMicProvider: (() => void) | null = null;
  let frameTimer: ReturnType<typeof setInterval> | null = null;
  let lastImagesRef: any = null;
  let lastExprStructSig = "";
  let lastRoomAvatarsSig = "";
  let lastEffectsSig = "";


  let toastMsg = ""; let toastType: "success" | "error" | "info" = "info";
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const inTauri = isTauriEnv();

  type SlotInfo = { label: string; desc: string };
  const slotDefs: Record<ImageSlot, SlotInfo> = {
    mouthClosed: { label: "Boca Fechada",      desc: "Padrão / em silêncio"     },
    mouthOpen:   { label: "Boca Aberta",        desc: "Enquanto estiver falando" },
    blinkClosed: { label: "Piscando (Fechada)", desc: "Piscada com boca fechada" },
    blinkOpen:   { label: "Piscando (Aberta)",  desc: "Piscada enquanto fala"    },
  };
  const slots: ImageSlot[] = ["mouthClosed", "mouthOpen", "blinkClosed", "blinkOpen"];

  const stateInfo: Record<string, { label: string; color: string }> = {
    "idle":          { label: "Em silêncio",       color: "#4caf82" },
    "talking":       { label: "Falando",            color: "#a21837" },
    "blink-idle":    { label: "Piscando",           color: "#e8a94a" },
    "blink-talking": { label: "Piscando (falando)", color: "#e8a94a" },
  };

  onMount(async () => {
    // Carregamento automático de personagem (preferência de início).
    // markDirty=false para não marcar "não salvo" ao abrir o app.
    try {
      const startId = resolveStartupCharacterId();
      if (startId) {
        if (getCharacter(startId)) applyCharacter(startId, { markDirty: false });
        else showToast("O personagem padrão não foi encontrado. Abrindo normalmente.", "info");
      }
    } catch {}

    if (inTauri) appVersion = await getAppVersion();
    stopController = startAvatarController();
    stopHotkeys = initHotkeyManager();
    stopMicProvider = startSharedMicProvider();

    // Tour de boas-vindas no primeiro uso (reabra depois pelo botão Tutorial).
    if (!tourSeen()) setTimeout(() => startTour(TOUR_FIRST), 700);

    if (inTauri) {
      // Performance pediu o estado inicial → envia config + imagens + imagem atual
      listen("performance:ready", () => {
        // Janela pronta para receber sync — NÃO significa que está visível.
        // perfOpen reflete só a visibilidade (definida ao abrir/fechar pelo botão).
        emitConfig();
        emitImages(true);
        emitExpression();
        emitReactionRule();
        emitReactionState();
        emitRoom(true);
        emitParticipantEffects(true);
        emit("avatar:image-changed", get(currentImageUrl)).catch(() => {});
      }).catch(() => {});


      // Detecta fechamento da janela de performance
      listen("tauri://destroyed", (event: any) => {
        const label = event?.windowLabel ?? event?.payload?.label;
        if (label === "performance") perfOpen = false;
      }).catch(() => {});

      // Quando a janela é ocultada por dentro (Esc), o botão volta para "Modo Janela".
      listen("performance:hidden", () => { perfOpen = false; }).catch(() => {});

      // Frame loop: envia estado + volume a 30fps (payload minúsculo)
      frameTimer = setInterval(() => {
        if (!perfOpen) return;
        emit("nokotuber:frame", { state: get(avatarState), level: get(audioLevel) }).catch(() => {});
      }, 1000 / 30);
      listen("performance:hidden", () => { perfOpen = false; }).catch(() => {});
    }
  });

  onDestroy(() => {
    stopController?.();
    stopHotkeys?.();
    stopMicProvider?.();
    if (toastTimer) clearTimeout(toastTimer);
    if (frameTimer) clearInterval(frameTimer);
  });

  // ─── Sync reativo com a performance ───
  function emitConfig() {
    const p = get(project);
    emit("nokotuber:config", {
      view: p.view, effects: p.effects,
      blinkConfig: p.blinkConfig, audioConfig: p.audioConfig,
      useDefaultAvatar: p.useDefaultAvatar,
      addons: p.addons,
      mouth: p.mouth,
    }).catch(() => {});
  }
  function emitImages(force = false) {
    const imgs = get(project).images;
    if (!force && imgs === lastImagesRef) return;
    lastImagesRef = imgs;
    emit("nokotuber:images", imgs).catch(() => {});
  }
  function emitExpression(force = false) {
    const st = get(expressionState);
    // Assinatura só da estrutura+imagens (ignora qual está ativa) → evita reenviar base64 ao só trocar de expressão
    const structSig = JSON.stringify(st.sets.map((s) => ({
      id: s.id, name: s.name,
      expressions: s.expressions.map((e) => ({
        id: e.id, name: e.name, slot: e.slot, hotkey: e.hotkey, fallbackColor: e.fallbackColor, images: e.images,
      })),
    })));
    if (force || structSig !== lastExprStructSig) {
      lastExprStructSig = structSig;
      emit("nokotuber:expression", st).catch(() => {});
    }
    emit("nokotuber:expression-active", { activeSetId: st.activeSetId, activeExpressionId: st.activeExpressionId }).catch(() => {});
  }

  function emitRoom(force = false) {
    const r = get(room);
    const avSig = JSON.stringify(r.avatars);
    if (force || avSig !== lastRoomAvatarsSig) {
      lastRoomAvatarsSig = avSig;
      emit("nokotuber:room-avatars", r.avatars).catch(() => {});
    }
    emit("nokotuber:room-state", {
      enabled: r.enabled, maxParticipants: r.maxParticipants, layoutMode: r.layoutMode,
      participants: r.participants,
    }).catch(() => {});
  }

  function emitParticipantEffects(force = false) {
    const list = get(participantEffects);
    const sig = JSON.stringify(list);
    if (force || sig !== lastEffectsSig) {
      lastEffectsSig = sig;
      emit("nokotuber:participant-effects", list).catch(() => {});
    }
  }

  function handleRoomToggle() {
    toggleRoomMode();
    if (get(room).enabled) leftTab = "sala";
    else if (leftTab === "sala") leftTab = "avatar";
  }


  function emitReactionRule()  { emit("nokotuber:reaction-rule", get(voiceReactionRule)).catch(() => {}); }
  function emitReactionState() { emit("nokotuber:reaction-state", { isReacting: get(isReacting), types: get(activeVoiceReactions) }).catch(() => {}); }

  $: if (inTauri && perfOpen) { $project.view; $project.effects; $project.blinkConfig; $project.audioConfig; $project.useDefaultAvatar; $project.addons; $project.mouth; emitConfig(); }
  $: if (inTauri && perfOpen) { if ($project.images !== lastImagesRef) { lastImagesRef = $project.images; emit("nokotuber:images", $project.images).catch(() => {}); } }
  $: if (inTauri) emit("avatar:image-changed", $currentImageUrl).catch(() => {});
  $: if (inTauri && perfOpen && $expressionState) emitExpression();
  $: if (inTauri && perfOpen && $voiceReactionRule) emitReactionRule();
  $: reactionSig = `${$isReacting}|${$activeVoiceReactions.join(",")}`;
  $: if (inTauri && perfOpen && reactionSig) emitReactionState();
  $: if (inTauri && perfOpen && $room) emitRoom();
  $: if (inTauri && perfOpen && $participantEffects) emitParticipantEffects();

  // ─── Toast ───
  function showToast(msg: string, type: "success" | "error" | "info" = "info") {
    toastMsg = msg; toastType = type;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastMsg = ""; }, 3500);
  }

  // ─── Handlers de menu ───
  async function handlePerformanceToggle() {
    openingPerf = true;
    try {
      const isOpen = await togglePerformanceWindow();
      perfOpen = isOpen;
      if (isOpen && inTauri) {
        // Garante que a janela receba o estado atual ao abrir
        emitConfig();
        emitImages(true);
        emitExpression();
        emitReactionRule();
        emitReactionState();
        emitRoom(true);
        emitParticipantEffects(true);
        emit("avatar:image-changed", get(currentImageUrl)).catch(() => {});
      }
      showToast(isOpen ? "Modo Janela ativado" : "Modo Janela fechado", "success");
    } catch (e: any) {
      showToast(e.message ?? "Erro", "error");
    } finally {
      openingPerf = false;
    }
  }
  function handleNew() {
    if ($isDirty && !window.confirm("Há alterações não salvas. Criar novo projeto?")) return;
    newProject(); resetProjectFile(); showToast("Novo projeto criado", "info");
  }
  async function handleOpen() {
    if ($isDirty && !window.confirm("Há alterações não salvas. Continuar?")) return;
    try {
      const r = await openProjectFile();
      if (!r) return;
      loadProjectFile(r.content, r.path);
      if (inTauri && perfOpen) {
        emitConfig(); emitImages(true);
        emitExpression(true); emitReactionRule(); emitReactionState();
        emitRoom(true); emitParticipantEffects(true);
      }
      showToast("Projeto aberto", "success");
    } catch (e: any) { showToast(e.message ?? "Erro ao abrir", "error"); }
  }
  async function handleSave() {
    try {
      const data = collectProjectFile();
      const content = JSON.stringify(data, null, 2);
      const path = get(currentProjectPath);
      if (path) { await saveProjectAtPath(path, content); }
      else {
        const np = await saveProjectAs(content, `${data.name}.noko`);
        if (!np) return; currentProjectPath.set(np);
      }
      isDirty.set(false); showToast("Projeto salvo", "success");
    } catch (e: any) { showToast(e.message ?? "Erro ao salvar", "error"); }
  }
  async function handleExport() {
    try {
      const data = collectProjectFile();
      const path = await exportProjectZip(JSON.stringify(data), `${data.name}.zip`);
      if (path) showToast(`Exportado: ${path.split(/[\\/]/).pop()}`, "success");
    } catch (e: any) { showToast(e.message ?? "Erro ao exportar", "error"); }
  }

  async function handleImportSlot(slot: ImageSlot) {
    importingSlot = slot;
    const url = await importImageFile();
    if (url) setImage(slot, url);
    importingSlot = null;
  }
  function handleClearSlot(slot: ImageSlot) { clearImage(slot); }
  async function handleToggleAudio() { $isAudioActive ? stopAudioCapture() : await startAudioCapture(); }

  function onThresholdInput(e: Event) { audioThreshold.set(parseInt((e.target as HTMLInputElement).value)); }
  function onIntervalMin (e: Event) { updateBlinkConfig({ intervalMin: parseFloat((e.target as HTMLInputElement).value) }); }
  function onIntervalMax (e: Event) { updateBlinkConfig({ intervalMax: parseFloat((e.target as HTMLInputElement).value) }); }
  function onDuration    (e: Event) { updateBlinkConfig({ duration:    parseInt  ((e.target as HTMLInputElement).value) }); }

  $: saveDisabled = !$isDirty && !!$currentProjectPath;
</script>

<div class="editor-root">

  <header class="topbar">
    <div class="topbar-left">
      <img src={APP_ICON_URL} alt={APP_NAME} class="brand-icon" />
      <span class="app-name">{APP_NAME}</span>
      <span class="app-version">v{appVersion}</span>
      {#if $currentProjectPath}<span class="project-path" title={$currentProjectPath}>· {$currentProjectPath.split(/[\\/]/).pop()}</span>{/if}
      {#if $isDirty}<span class="dirty-badge">● não salvo</span>{/if}
    </div>
    <nav class="topbar-actions">
      <button class="btn btn-ghost" on:click={handleNew}>Novo</button>
      <button class="btn btn-ghost" on:click={handleOpen}>Abrir</button>
      <button class="btn btn-ghost" disabled={saveDisabled} on:click={handleSave}>Salvar</button>
      <button class="btn btn-ghost" on:click={handleExport}>Exportar</button>
      <button class="btn btn-ghost" on:click={openStore} title="Loja de acessórios" data-tour="store">🛒 Loja</button>
      <button class="btn btn-ghost" on:click={openTourMenu} title="Abrir o tutorial">❓ Tutorial</button>
      <button class="btn btn-ghost btn-icon-only" on:click={() => showAbout = true} title="Sobre">ℹ</button>
      <button class="btn btn-ghost" class:btn-active={$room.enabled} on:click={handleRoomToggle} title="Alternar modo sala" data-tour="mode-toggle">
        {$room.enabled ? "👥 Sala: ON" : "👤 Sala: OFF"}
      </button>
      <span data-tour="simple-advanced"><SimpleAdvancedToggle /></span>
      <div class="topbar-divider" />
      <button class="btn" class:btn-accent={!perfOpen} class:btn-stop={perfOpen} on:click={handlePerformanceToggle} disabled={openingPerf} data-tour="perf-window">
        {#if openingPerf}…{:else if perfOpen}■ Fechar Janela{:else}▶ Modo Janela{/if}
      </button>
    </nav>
  </header>

  <div class="editor-body">

    <!-- ESQUERDA: tabs Avatar / Visual -->
    <aside class="panel panel-left">
      <div class="tabs">
        <button class="tab" class:active={leftTab === "avatar"} on:click={() => leftTab = "avatar"}>Avatar</button>
        <button class="tab" class:active={leftTab === "visual"} on:click={() => leftTab = "visual"}>Visualização</button>
        <button class="tab" class:active={leftTab === "expr"} on:click={() => leftTab = "expr"}>Expressões</button>
        {#if $room.enabled}
          <button class="tab" class:active={leftTab === "sala"} on:click={() => leftTab = "sala"}>Sala</button>
        {/if}
      </div>

      {#if leftTab === "avatar"}
        <div class="char-lib" data-tour="characters">
          <SectionAccordion title="Meus Personagens" storageKey="avatar-chars" open={false} badge={String($characters.length)}>
            <CharacterLibraryPanel toast={showToast} />
          </SectionAccordion>
        </div>
        <div class="section-header">
          <span>IMAGENS</span>
          <button class="section-toggle" class:active={$project.useDefaultAvatar} on:click={toggleDefaultAvatar}>
            {$project.useDefaultAvatar ? "● padrão" : "○ padrão"}
          </button>
        </div>
        <div class="slot-list" data-tour="avatar-images">
          {#each slots as slot}
            {@const info = slotDefs[slot]}
            {@const userImg = $project.images[slot]}
            {@const defaultImg = $project.useDefaultAvatar ? DEFAULT_AVATAR[slot] : null}
            {@const imgUrl = userImg ?? defaultImg}
            {@const usingDef = !userImg && !!defaultImg}
            {@const active = !!imgUrl && $currentImageUrl === imgUrl}
            {@const loading = importingSlot === slot}
            <div class="slot-card" class:active class:has-image={!!imgUrl}>
              <button class="slot-thumb" on:click={() => handleImportSlot(slot)} title="Clique para importar">
                {#if imgUrl}<img src={imgUrl} alt={info.label} />{#if usingDef}<span class="default-badge">padrão</span>{/if}
                {:else if loading}<span class="slot-loading">…</span>
                {:else}<span class="slot-empty">+</span>{/if}
              </button>
              <div class="slot-info">
                <span class="slot-label">{info.label}</span>
                <span class="slot-desc">{info.desc}</span>
                {#if active}<span class="slot-active-badge">● ativo</span>{/if}
              </div>
              <div class="slot-actions">
                <button class="slot-btn" on:click={() => handleImportSlot(slot)} title="Importar">+</button>
                {#if userImg}<button class="slot-btn slot-btn-del" on:click={() => handleClearSlot(slot)} title="Remover">×</button>{/if}
              </div>
            </div>
          {/each}
        </div>

        <div class="section-header section-header-top">PISCADA</div>
        <div class="config-list">
          <div class="config-row"><span class="config-label">Intervalo mín.</span>
            <input class="config-range" type="range" min="1" max="15" step="0.5" value={$project.blinkConfig.intervalMin} on:input={onIntervalMin} />
            <span class="config-value">{$project.blinkConfig.intervalMin}s</span></div>
          <div class="config-row"><span class="config-label">Intervalo máx.</span>
            <input class="config-range" type="range" min="2" max="30" step="0.5" value={$project.blinkConfig.intervalMax} on:input={onIntervalMax} />
            <span class="config-value">{$project.blinkConfig.intervalMax}s</span></div>
          <div class="config-row"><span class="config-label">Duração</span>
            <input class="config-range" type="range" min="50" max="500" step="10" value={$project.blinkConfig.duration} on:input={onDuration} />
            <span class="config-value">{$project.blinkConfig.duration}ms</span></div>
        </div>

        {#if $uiPrefs.mode === "advanced"}
          <div class="char-lib" data-tour="addons">
            <SectionAccordion title="Acessórios" storageKey="avatar-addons" open={false} badge={String($project.addons?.length ?? 0)}>
              <AddonControls addons={$project.addons ?? []}
                onAdd={addProjectAddon} onRemove={removeProjectAddon} onUpdate={updateProjectAddon} />
            </SectionAccordion>
          </div>
          <div class="char-lib" data-tour="visemes">
            <SectionAccordion title="Boca / Visemas" storageKey="avatar-mouth" open={false} badge={$project.mouth?.mode === "visemes" ? "ativo" : null}>
              <MouthControls mouth={$project.mouth}
                onUpdate={updateMouth} onSetImage={setVisemeImage} onClearImage={clearVisemeImage} />
            </SectionAccordion>
          </div>
        {/if}
      {:else if leftTab === "visual"}
        <ViewSettingsPanel />
      {:else if leftTab === "sala"}
        <div class="expr-wrap"><RoomPanel /></div>
      {:else}
        <div class="expr-wrap"><ExpressionTabsPanel /></div>
      {/if}
    </aside>

    <!-- CENTRO -->
    <main class="editor-center">
      {#if $room.enabled}
        <RoomStage width={720} height={405} transparent={false} />
      {:else}
        <AvatarStage width={640} height={480} transparent={false} />
      {/if}
    </main>

    <!-- DIREITA: Estado + Efeitos -->
    <aside class="panel panel-right">
      <div class="section-header">ESTADO</div>
      <div class="state-badge-wrap">
        <div class="state-badge" style="background: {stateInfo[$avatarState]?.color ?? '#444'}22; color: {stateInfo[$avatarState]?.color ?? '#888'}; border-color: {stateInfo[$avatarState]?.color ?? '#444'}44;">
          {stateInfo[$avatarState]?.label ?? "—"}
        </div>
      </div>
      {#if $uiPrefs.mode === "advanced"}
        <div class="section-header section-header-top">EFEITOS</div>
        <EffectsPanel />
      {/if}
      <div class="section-header section-header-top">ÁUDIO</div>
      <div class="vr-wrap"><MicrophoneSettings /></div>
      {#if $uiPrefs.mode === "advanced"}
        <div class="section-header section-header-top">REAÇÃO DE VOZ</div>
        <div class="vr-wrap"><VoiceReactionSettings /></div>
      {/if}
    </aside>

  </div>

  <footer class="editor-footer" data-tour="mic-footer">
    <button class="btn btn-sm" class:btn-active={$isAudioActive} on:click={handleToggleAudio}>
      {$isAudioActive ? "🎙 Parar mic" : "🎙 Ligar mic"}
    </button>
    <button class="btn btn-sm" on:click={simulateReaction} title="Dispara a reação para teste">⚡ Reação</button>
    <div class="audio-group">
      <span class="audio-label">Threshold</span>
      <input class="footer-range" type="range" min="0" max="100" value={$audioThreshold} on:input={onThresholdInput} />
      <span class="audio-value">{$audioThreshold}</span>
    </div>
    <div class="volume-wrap">
      <div class="volume-bar" class:talking={$isTalking} style="width:{$audioLevel}%" />
      <div class="threshold-line" style="left:{$audioThreshold}%" />
    </div>
    <span class="footer-state" style="color: {stateInfo[$avatarState]?.color ?? '#888'}">
      {#if $isAudioActive}{stateInfo[$avatarState]?.label ?? ""}{:else}Microfone inativo{/if}
    </span>
  </footer>

</div>

{#if toastMsg}<div class="toast toast-{toastType}">{toastMsg}</div>{/if}
{#if showAbout}<AboutModal onClose={() => showAbout = false} />{/if}
<StorePanel />
<OnboardingTour />

<style>
  .editor-root { display: flex; flex-direction: column; width: 100vw; height: 100vh; background: var(--color-bg-primary); color: var(--color-text-primary); overflow: hidden; }
  .topbar { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 16px; background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
  .topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
  .brand-icon { width: 28px; height: 28px; border-radius: var(--radius-sm); object-fit: contain; flex-shrink: 0; }
  .app-name { font-size: 16px; font-weight: 700; letter-spacing: 0.3px; flex-shrink: 0; }
  .app-version { font-size: 11px; color: var(--color-text-dim); flex-shrink: 0; }
  .project-path { font-size: 12px; color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }
  .dirty-badge { font-size: 11px; color: var(--color-warning); flex-shrink: 0; }
  .topbar-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
  .topbar-divider { width: 1px; height: 22px; background: var(--color-border); margin: 0 6px; }

  .btn { padding: 6px 12px; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; font-family: inherit; transition: all 0.15s; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: var(--color-text-secondary); }
  .btn-ghost:hover:not(:disabled) { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .btn-accent { background: var(--color-accent); color: #fff; font-weight: 600; }
  .btn-accent:hover:not(:disabled) { background: var(--color-accent-hover); }
  .btn-stop { background: var(--color-warning); color: #1c1818; font-weight: 600; }
  .btn-stop:hover:not(:disabled) { background: #f5b85d; }
  .btn-icon-only { width: 30px; padding: 6px 0; font-size: 14px; }
  .btn-sm { padding: 5px 10px; font-size: 12px; background: var(--color-bg-hover); color: var(--color-text-secondary); }
  .btn-sm:hover { background: var(--color-accent-soft); color: var(--color-text-primary); }
  .btn-active { background: var(--color-accent-soft) !important; color: var(--color-accent-hover) !important; }

  .editor-body { display: flex; flex: 1; overflow: hidden; min-width: 0; }
  .panel { background: var(--color-bg-panel); display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto; overflow-x: hidden; }
  .panel-left  { width: 270px; border-right: 1px solid var(--color-border); }
  .panel-right { width: 250px; border-left:  1px solid var(--color-border); }

  /* Responsividade: em janelas mais estreitas, painéis encolhem (sem barra horizontal). */
  @media (max-width: 1120px) {
    .panel-left  { width: 240px; }
    .panel-right { width: 220px; }
  }
  @media (max-width: 1000px) {
    .panel-left  { width: 220px; }
    .panel-right { width: 206px; }
    .topbar { padding: 0 10px; }
    .topbar-actions .btn { padding: 6px 9px; font-size: 12px; }
  }

  .tabs { display: flex; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
  .tab { flex: 1; background: transparent; border: none; padding: 10px 6px; font-size: 11px; font-weight: 600; color: var(--color-text-dim); cursor: pointer; font-family: inherit; border-bottom: 2px solid transparent; white-space: nowrap; }
  .tab:hover { color: var(--color-text-secondary); }
  .tab.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }

  .section-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: var(--color-text-dim); border-bottom: 1px solid var(--color-border-soft); flex-shrink: 0; }
  .section-header-top { border-top: 1px solid var(--color-border-soft); }
  .section-toggle { background: transparent; border: 1px solid var(--color-border-soft); color: var(--color-text-dim); font-size: 9px; padding: 2px 6px; border-radius: var(--radius-sm); cursor: pointer; font-family: inherit; text-transform: none; letter-spacing: normal; }
  .section-toggle.active { color: var(--color-accent); border-color: var(--color-accent-dim); }

  .slot-list { display: flex; flex-direction: column; padding: 6px; gap: 5px; }
  .slot-card { display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 6px; border-radius: var(--radius-md); border: 1px solid var(--color-border-soft); border-left: 3px solid transparent; background: var(--color-bg-panel-2); transition: all 0.15s; min-height: 60px; }
  .slot-card.active { border-left-color: var(--color-accent); background: var(--color-accent-soft); }
  .slot-thumb { position: relative; width: 48px; height: 48px; flex-shrink: 0; border-radius: var(--radius-sm); border: 1px dashed var(--color-border); background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; padding: 0; }
  .slot-thumb:hover { border-color: var(--color-accent); }
  .slot-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .slot-empty { font-size: 20px; color: var(--color-text-dim); }
  .slot-loading { font-size: 16px; color: var(--color-text-dim); }
  .default-badge { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: var(--color-text-secondary); font-size: 8px; padding: 1px; text-align: center; text-transform: uppercase; }
  .slot-info { flex: 1; display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
  .slot-label { font-size: 12px; font-weight: 600; }
  .slot-desc { font-size: 10px; color: var(--color-text-dim); }
  .slot-active-badge { font-size: 10px; color: var(--color-accent); font-weight: 600; }
  .slot-actions { display: flex; flex-direction: column; gap: 3px; }
  .slot-btn { width: 22px; height: 22px; border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); color: var(--color-text-secondary); cursor: pointer; font-size: 15px; line-height: 1; display: flex; align-items: center; justify-content: center; padding: 0; }
  .slot-btn:hover { background: var(--color-accent-soft); color: var(--color-text-primary); }
  .slot-btn-del:hover { background: var(--color-accent-dim); color: white; }

  .config-list { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; }
  .config-row { display: flex; align-items: center; gap: 6px; }
  .config-label { font-size: 10px; color: var(--color-text-secondary); width: 80px; flex-shrink: 0; }
  .config-range { flex: 1; accent-color: var(--color-accent); }
  .config-value { width: 36px; text-align: right; font-size: 10px; color: var(--color-text-dim); }

  .expr-wrap { padding: 10px; }
  .vr-wrap { padding: 8px 12px 14px; }
  .char-lib { padding: 6px 6px 0; }

  .editor-center { flex: 1; display: flex; align-items: center; justify-content: center; background: var(--color-bg-primary); overflow: hidden; }

  .state-badge-wrap { padding: 10px; }
  .state-badge { padding: 7px 10px; border-radius: 20px; border: 1px solid; font-size: 12px; font-weight: 600; text-align: center; }

  .editor-footer { display: flex; align-items: center; gap: 12px; height: 46px; padding: 0 14px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); flex-shrink: 0; }
  .audio-group { display: flex; align-items: center; gap: 8px; }
  .audio-label { font-size: 11px; color: var(--color-text-secondary); white-space: nowrap; }
  .audio-value { width: 26px; font-size: 11px; color: var(--color-text-dim); }
  .footer-range { width: 80px; accent-color: var(--color-accent); }
  .volume-wrap { flex: 1; height: 8px; background: var(--color-bg-hover); border-radius: 4px; position: relative; overflow: hidden; max-width: 200px; }
  .volume-bar { height: 100%; background: var(--color-success); border-radius: 4px; transition: width 0.05s, background 0.1s; max-width: 100%; }
  .volume-bar.talking { background: var(--color-accent); }
  .threshold-line { position: absolute; top: 0; width: 2px; height: 100%; background: var(--color-warning); transform: translateX(-50%); }
  .footer-state { font-size: 12px; font-weight: 600; white-space: nowrap; min-width: 120px; }

  .toast { position: fixed; bottom: 64px; left: 50%; transform: translateX(-50%); padding: 10px 18px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; z-index: 2000; border: 1px solid; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
  .toast-success { background: #1b3a2a; color: #6dd49f; border-color: #2d5a3f; }
  .toast-error   { background: #3a1a22; color: #e85c7a; border-color: #5a2030; }
  .toast-info    { background: #261f1f; color: #f4ebe8; border-color: var(--color-border); }
</style>