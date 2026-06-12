<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import AvatarStage from "./components/AvatarStage.svelte";
  import RoomStage from "./components/RoomStage.svelte";
  import { room } from "../room/roomStore";
  import { participantEffects } from "../effects/participantEffectsStore";
  import { listen, emit } from "@tauri-apps/api/event";
  import { isTauriEnv, closePerformanceWindow } from "../core/desktop";
  import { currentImageUrl, avatarState } from "../avatar/avatarController";
  import { audioLevel, isTalking, voiceReactionRule, isReacting, activeVoiceReactions } from "../audio/audioStore";
  import { applyConfigSync, applyImagesSync } from "../project/projectStore";
  import { expressionState } from "../project/expressionStore";
  import { DEFAULT_AVATAR } from "../config/defaultAvatar";

  let windowWidth  = 1280;
  let windowHeight = 720;
  let showDebug    = false;
  let imgStatus    = "verificando…";
  let debugLines: string[] = [];
  let unlisteners: Array<() => void> = [];

  function log(msg: string) {
    debugLines = [...debugLines.slice(-7), msg];
  }

  function handleResize() {
    windowWidth  = window.innerWidth;
    windowHeight = window.innerHeight;
  }
  async function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      try { await emit("performance:hidden", null); } catch {}
      try { await closePerformanceWindow(); } catch {}
    }
    if (e.key.toLowerCase() === "d") showDebug = !showDebug;
  }

  onMount(async () => {
    try {
      windowWidth  = window.innerWidth  || 1280;
      windowHeight = window.innerHeight || 720;
      window.addEventListener("resize",  handleResize);
      window.addEventListener("keydown", handleKeydown);

      log("URL: " + window.location.href);
      log("Tauri: " + isTauriEnv());

      // RENDER IMEDIATO: mostra o avatar padrão sem esperar eventos
      const fallback = get(currentImageUrl) ?? DEFAULT_AVATAR.mouthClosed;
      currentImageUrl.set(fallback);
      log("imageUrl: " + (fallback ? fallback.slice(0, 45) : "null"));

      if (fallback) {
        const test = new Image();
        test.onload  = () => { imgStatus = `OK (${test.naturalWidth}×${test.naturalHeight})`; };
        test.onerror = () => { imgStatus = "FALHOU ao carregar"; };
        test.src = fallback;
      } else {
        imgStatus = "sem imagem";
      }

      if (isTauriEnv()) {
        unlisteners.push(await listen<string | null>("avatar:image-changed", (e) => {
          currentImageUrl.set(e.payload ?? null);
        }));
        unlisteners.push(await listen<any>("nokotuber:config", (e) => {
          if (e.payload) applyConfigSync(e.payload);
        }));
        unlisteners.push(await listen<any>("nokotuber:images", (e) => {
          if (e.payload) applyImagesSync(e.payload);
        }));
        unlisteners.push(await listen<any>("nokotuber:frame", (e) => {
          if (e.payload) {
            avatarState.set(e.payload.state);
            audioLevel.set(e.payload.level);
            isTalking.set(e.payload.state === "talking" || e.payload.state === "blink-talking");
          }
        }));

        // ─── Sync da Fase 5: expressão + reações de voz ───
        unlisteners.push(await listen<any>("nokotuber:expression", (e) => {
          if (e.payload) expressionState.set(e.payload);
        }));
        unlisteners.push(await listen<any>("nokotuber:expression-active", (e) => {
          const p = e.payload; if (!p) return;
          expressionState.update((s) => ({ ...s, activeSetId: p.activeSetId, activeExpressionId: p.activeExpressionId }));
        }));
        unlisteners.push(await listen<any>("nokotuber:reaction-rule", (e) => {
          if (e.payload) voiceReactionRule.set(e.payload);
        }));
        unlisteners.push(await listen<any>("nokotuber:reaction-state", (e) => {
          const p = e.payload; if (!p) return;
          isReacting.set(!!p.isReacting);
          activeVoiceReactions.set(p.isReacting ? (p.types ?? []) : []);
        }));
        unlisteners.push(await listen<any>("nokotuber:room-avatars", (e) => {
          if (e.payload) room.update((r) => ({ ...r, avatars: e.payload }));
        }));
        unlisteners.push(await listen<any>("nokotuber:room-state", (e) => {
          const p = e.payload; if (!p) return;
          room.update((r) => ({
            ...r,
            enabled: !!p.enabled,
            maxParticipants: p.maxParticipants ?? r.maxParticipants,
            layoutMode: p.layoutMode ?? r.layoutMode,
            participants: p.participants ?? r.participants,
          }));
        }));
        unlisteners.push(await listen<any>("nokotuber:participant-effects", (e) => {
          if (Array.isArray(e.payload)) participantEffects.set(e.payload);
        }));

        await emit("performance:ready", null);
        log("listeners OK, ready enviado");
      }
    } catch (err: any) {
      log("ERRO: " + (err?.message ?? String(err)));
    }
  });

  onDestroy(() => {
    unlisteners.forEach((u) => { try { u(); } catch {} });
    window.removeEventListener("resize",  handleResize);
    window.removeEventListener("keydown", handleKeydown);
  });
</script>

<div class="performance-root">
  {#if $room.enabled}
    <RoomStage width={windowWidth} height={windowHeight} transparent={true} />
  {:else}
    <AvatarStage width={windowWidth} height={windowHeight} transparent={true} />
  {/if}

  {#if showDebug}
    <div class="debug">
      <div class="debug-title">DEBUG · tecla D oculta · Esc fecha</div>
      <div>Janela: {windowWidth}×{windowHeight}</div>
      <div>Imagem: <b>{imgStatus}</b></div>
      <div>Estado: {$avatarState}</div>
      <div>Reação: {$isReacting ? $activeVoiceReactions : "—"}</div>
      <div class="url">imageUrl: {$currentImageUrl ? $currentImageUrl.slice(0, 55) : "null"}</div>
      <hr />
      {#each debugLines as line}<div class="dl">{line}</div>{/each}
    </div>
  {/if}
</div>

<style>
  :global(body) { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
  .performance-root {
    width: 100vw; height: 100vh; background: transparent;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; position: fixed; top: 0; left: 0;
  }
  .debug {
    position: fixed; top: 8px; left: 8px;
    background: rgba(20, 15, 15, 0.92);
    color: #f4ebe8; font-family: 'Consolas', monospace; font-size: 11px;
    padding: 8px 10px; border-radius: 6px; border: 1px solid #a21837;
    max-width: 460px; line-height: 1.5; z-index: 9999; pointer-events: none;
  }
  .debug-title { color: #a21837; font-weight: bold; margin-bottom: 4px; }
  .debug .url { color: #b8a8a4; word-break: break-all; }
  .debug hr { border: none; border-top: 1px solid #583535; margin: 4px 0; }
  .debug .dl { color: #8aa; }
  .debug b { color: #4caf82; }
</style>