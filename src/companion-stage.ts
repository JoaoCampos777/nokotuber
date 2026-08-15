import { listen, emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { get } from "svelte/store";
import { RoomRenderer2D, type RoomFrameInput } from "./renderer/RoomRenderer2D";
import type { RoomSnapshotMessage } from "./companion/companionStageTypes";
import { activeRoomReactions, applyReaction } from "./room/roomReactions";

console.log("[companion-stage] boot");

const canvas = document.getElementById("stage-canvas") as HTMLCanvasElement | null;
const ph = document.getElementById("ph");

let snapshot: RoomSnapshotMessage | null = null;
// Fala que chegou antes do snapshot — aplicada assim que a cena chegar.
const pendingSpeaking = new Map<string, boolean>();

function applySpeaking(participantId: string, isSpeaking: boolean): void {
  if (!snapshot) return;
  snapshot = { ...snapshot, participants: snapshot.participants.map((p) => p.id === participantId ? { ...p, isSpeaking } : p) };
}

function refreshPlaceholder(html?: string): void {
  if (!ph) return;
  if (html) ph.innerHTML = html;
  const hasParticipants = !!snapshot && snapshot.participants.length > 0;
  ph.classList.toggle("hidden", hasParticipants);
}

// Alimenta o renderer com o snapshot recebido do Host (mesmo formato do Host:
// participantes, avatares, efeitos por participante e fundo da cena).
function getState(): RoomFrameInput {
  if (!snapshot) {
    return { participants: [], avatars: {}, effects: {}, background: { mode: "transparent", color: "#1c1818" } };
  }
  const scene = snapshot.scene ?? ({ backgroundMode: "transparent", backgroundColor: "#00FF00" } as any);
  return {
    participants: snapshot.participants,
    avatars: snapshot.avatars as any,
    effects: (snapshot.effects ?? {}) as any,
    reactions: get(activeRoomReactions),
    background: { mode: scene.backgroundMode ?? "transparent", color: scene.backgroundColor ?? "#00FF00" },
  };
}

let renderer: RoomRenderer2D | null = null;
if (canvas) {
  renderer = new RoomRenderer2D({
    canvas,
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
    transparent: true,
    getState,
  });
  window.addEventListener("resize", () => {
    renderer?.resize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
  });
} else {
  refreshPlaceholder("Erro: canvas não encontrado.");
}

window.addEventListener("keydown", async (e) => {
  // Janela reutilizável: Esc oculta (não destrói), para poder reabrir.
  if (e.key === "Escape") {
    try { await invoke("close_companion_performance_window"); }
    catch (err) { console.error("[companion-stage] hide falhou", err); }
  }
});

(async () => {
  try {
    await listen<RoomSnapshotMessage>("companion-stage:snapshot", (ev) => {
      snapshot = (ev.payload as any) ?? null;
      // Aplica qualquer fala que tenha chegado antes da cena.
      if (snapshot && pendingSpeaking.size) {
        for (const [id, is] of pendingSpeaking) applySpeaking(id, is);
        pendingSpeaking.clear();
      }
      console.log("[companion-stage] snapshot recebido:", snapshot?.participants?.length ?? 0, "participante(s)");
      refreshPlaceholder();
    });
    await listen<{ participantId: string; isSpeaking: boolean }>("companion-stage:speaking", (ev) => {
      const { participantId, isSpeaking } = (ev.payload as any) ?? {};
      if (!participantId) return;
      // Aplica imediatamente; o renderer (rAF) mostra no próximo frame.
      if (snapshot) applySpeaking(participantId, !!isSpeaking);
      else pendingSpeaking.set(participantId, !!isSpeaking);
    });
    await listen("companion-stage:reaction", (ev) => {
      const r = (ev.payload as any) ?? {};
      applyReaction(r.participantId, r.effects ?? [], typeof r.intensity === "number" ? r.intensity : 70, typeof r.durationMs === "number" ? r.durationMs : 700);
    });
    console.log("[companion-stage] listening");
    // Reanuncia "ready" ao ganhar foco (reabertura), para o Companion reenviar a cena atual.
    await listen("tauri://focus", () => { emit("companion-stage:ready", null).catch(() => {}); });
    await emit("companion-stage:ready", null);
    console.log("[companion-stage] ready emitted");
  } catch (err) {
    console.error("[companion-stage] erro ao iniciar eventos", err);
    refreshPlaceholder("Janela aberta, mas sem conexão com o app.<br><small>Feche e reabra pelo Modo Companion.</small>");
  }
})();
