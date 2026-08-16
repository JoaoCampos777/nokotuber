import { writable, get } from "svelte/store";
import { emit, listen } from "@tauri-apps/api/event";
import { ASSET_PREFIX, type RoomSnapshotMessage } from "./companionStageTypes";

/** Último snapshot da cena do Host (com imagens já resolvidas do cache). */
export const companionStageSnapshot = writable<RoomSnapshotMessage | null>(null);

function isTauri(): boolean { return typeof (window as any).__TAURI_INTERNALS__ !== "undefined"; }

// ─── Cache de assets (imagens) recebidos separadamente do snapshot ───
const assetCache = new Map<string, string>();      // assetId -> dataUrl
let lastLiteSnapshot: RoomSnapshotMessage | null = null;

function resolveImg(v: string | null): string | null {
  if (!v) return null;
  if (v.startsWith(ASSET_PREFIX)) return assetCache.get(v.slice(ASSET_PREFIX.length)) ?? null; // falta → placeholder
  return v; // URL leve/inline
}
function resolveMap(src: Record<string, string | null> | undefined): any {
  const out: any = {};
  for (const slot of Object.keys(src ?? {})) out[slot] = resolveImg((src as any)[slot]);
  return out;
}
function resolveSnapshot(lite: RoomSnapshotMessage): RoomSnapshotMessage {
  const avatars: any = {};
  for (const [id, a] of Object.entries(lite.avatars ?? {})) {
    const av: any = { ...(a as any), images: resolveMap((a as any).images) };
    if (Array.isArray((a as any).expressions)) {
      av.expressions = (a as any).expressions.map((e: any) => ({ ...e, images: resolveMap(e?.images) }));
    }
    if (Array.isArray((a as any).addons)) {
      av.addons = (a as any).addons.map((ad: any) => ({ ...ad, image: resolveImg(ad?.image ?? null) }));
    }
    if ((a as any).mouth?.visemes) {
      av.mouth = { ...(a as any).mouth, visemes: resolveMap((a as any).mouth.visemes) };
    }
    avatars[id] = av;
  }
  return { ...lite, avatars };
}
function collectRefs(src: Record<string, string | null> | undefined, out: Set<string>): void {
  for (const v of Object.values(src ?? {})) {
    if (typeof v === "string" && v.startsWith(ASSET_PREFIX)) {
      const id = v.slice(ASSET_PREFIX.length);
      if (!assetCache.has(id)) out.add(id);
    }
  }
}
function missingAssetIds(lite: RoomSnapshotMessage): string[] {
  const ids = new Set<string>();
  for (const a of Object.values(lite.avatars ?? {})) {
    collectRefs((a as any).images, ids);
    for (const e of ((a as any).expressions ?? [])) collectRefs(e?.images, ids);
    for (const ad of ((a as any).addons ?? [])) {
      const v = ad?.image;
      if (typeof v === "string" && v.startsWith(ASSET_PREFIX)) {
        const aid = v.slice(ASSET_PREFIX.length);
        if (!assetCache.has(aid)) ids.add(aid);
      }
    }
    collectRefs((a as any).mouth?.visemes, ids);
  }
  return [...ids];
}
function emitResolved(): void {
  if (!lastLiteSnapshot) return;
  const resolved = resolveSnapshot(lastLiteSnapshot);
  // Preserva o isSpeaking mais recente (vindo de participant_speaking) ao re-resolver
  // — evita "piscar" a boca quando um asset chega durante a fala.
  const cur = get(companionStageSnapshot);
  if (cur) {
    const speakingById = new Map(cur.participants.map((p) => [p.id, p.isSpeaking]));
    resolved.participants = resolved.participants.map((p) =>
      speakingById.has(p.id) ? { ...p, isSpeaking: !!speakingById.get(p.id) } : p);
  }
  companionStageSnapshot.set(resolved);
  emitToStage("companion-stage:snapshot", resolved);
}

/** Emite para a Janela do Companion sem bloquear (fire-and-forget, baixa latência). */
function emitToStage(event: string, payload: any): void {
  if (!isTauri()) return;
  emit(event, payload).catch((e) => console.error("[companion] emitToStage falhou", event, e));
}

/**
 * Aplica um snapshot LEVE (imagens como refs `asset:<hash>`), resolve pelo cache
 * e repassa à Janela. Retorna os assetIds ausentes, para o Companion pedi-los.
 */
export function applyRoomSnapshot(lite: RoomSnapshotMessage): string[] {
  lastLiteSnapshot = lite;
  const missing = missingAssetIds(lite);
  emitResolved();
  return missing;
}

/** Cacheia uma imagem recebida separadamente e re-resolve a cena (avatares preenchem). */
export function applyRoomAsset(assetId: string, dataUrl: string): void {
  if (!assetId || !dataUrl || assetCache.get(assetId) === dataUrl) return;
  assetCache.set(assetId, dataUrl);
  emitResolved();
}

/** Atualiza apenas o estado de fala de um participante (mensagem leve). */
export function applyParticipantSpeaking(participantId: string, isSpeaking: boolean): void {
  companionStageSnapshot.update((snap) => {
    if (!snap) return snap;
    return { ...snap, participants: snap.participants.map((p) => p.id === participantId ? { ...p, isSpeaking } : p) };
  });
  emitToStage("companion-stage:speaking", { participantId, isSpeaking });
}

/** Repassa uma reação de voz disparada no Host para a Janela do Companion reproduzir. */
export function applyParticipantReaction(payload: any): void {
  emitToStage("companion-stage:reaction", {
    participantId: payload?.participantId,
    effects: Array.isArray(payload?.effects) ? payload.effects : [],
    intensity: typeof payload?.intensity === "number" ? payload.intensity : 70,
    durationMs: typeof payload?.durationMs === "number" ? payload.durationMs : 700,
    expressionId: typeof payload?.expressionId === "string" ? payload.expressionId : null,
  });
}

let bridgeInited = false;
/** Quando a Janela do Companion abre e emite "ready", reenvia o snapshot atual. */
export async function initCompanionStageBridge(): Promise<void> {
  if (bridgeInited || !isTauri()) return;
  bridgeInited = true;
  try {
    await listen("companion-stage:ready", () => {
      const snap = get(companionStageSnapshot);
      if (snap) emitToStage("companion-stage:snapshot", snap);
    });
  } catch (e) { console.error("[companion] initCompanionStageBridge falhou", e); }
}
