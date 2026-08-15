// Host → Companions: gera e envia o snapshot da cena da sala pelo servidor WS.
// Não altera o fluxo de fala existente; só adiciona o envio de cenas.
import { get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { room, visibleParticipants } from "../room/roomStore";
import { ROOM_CANVAS } from "../room/roomTypes";
import { project } from "../project/projectStore";
import { participantEffects } from "../effects/participantEffectsStore";
import { applyReaction } from "../room/roomReactions";
import { audioLevel } from "../audio/audioStore";
import { audioRouting } from "../audio/audioBindingStore";
import { ASSET_PREFIX, type RoomSnapshotMessage } from "./companionStageTypes";

function isTauri(): boolean { return typeof (window as any).__TAURI_INTERNALS__ !== "undefined"; }

function currentRoomCode(): string {
  try { const raw = localStorage.getItem("nokotuber:companionRoom:v1"); return raw ? (JSON.parse(raw).roomId ?? "") : ""; }
  catch { return ""; }
}

// ─── Assets pesados (imagens base64) separados do snapshot ───
const assetRegistry = new Map<string, string>(); // assetId -> dataUrl
const assetIdByUrl = new Map<string, string>();   // dataUrl -> assetId (evita re-hash de MBs)

/** Hash rápido e estável (cyrb53) do conteúdo — mesmo conteúdo ⇒ mesmo id. */
function hashAsset(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** data: URL (base64 pesado) → "asset:<hash>" (registrado). URL leve/interna → inline. */
function toAssetRef(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("data:")) return url; // ex.: /assets/... resolve no próprio build do Companion
  let id = assetIdByUrl.get(url);
  if (!id) { id = hashAsset(url); assetIdByUrl.set(url, id); }
  assetRegistry.set(id, url);
  return ASSET_PREFIX + id;
}

const IMAGE_SLOTS = ["mouthClosed", "mouthOpen", "blinkClosed", "blinkOpen"] as const;

/** Converte um conjunto de 4 imagens em refs `asset:<hash>` e registra os ids. */
function refImages(src: any, requiredAssets: string[]): any {
  const out: any = {};
  for (const slot of IMAGE_SLOTS) {
    const ref = toAssetRef(src?.[slot]);
    out[slot] = ref;
    if (typeof ref === "string" && ref.startsWith(ASSET_PREFIX)) {
      const id = ref.slice(ASSET_PREFIX.length);
      if (!requiredAssets.includes(id)) requiredAssets.push(id);
    }
  }
  return out;
}

/** Monta o snapshot da cena a partir do room store (participantes visíveis + avatares + efeitos + fundo). */
export function buildRoomSnapshot(): RoomSnapshotMessage {
  const participants = get(visibleParticipants);
  const r = get(room);
  const avatars: RoomSnapshotMessage["avatars"] = {};
  const requiredAssets: string[] = [];
  for (const p of participants) {
    const a = r.avatars.find((x) => x.id === p.avatarId);
    if (a && !avatars[a.id]) {
      const images = refImages(a.images, requiredAssets);
      const expressions = (a.expressions ?? []).map((e) => ({
        id: e.id, name: e.name, hotkey: e.hotkey, images: refImages(e.images, requiredAssets),
      }));
      avatars[a.id] = {
        id: a.id, name: a.name, images, expressions,
        activeExpressionId: a.activeExpressionId ?? null,
        shoutExpressionId: a.shoutExpressionId ?? null,
      };
    }
  }
  // Efeitos por participante (mesmo formato/store do Host) — só dos visíveis.
  const fxList = get(participantEffects);
  const effects: RoomSnapshotMessage["effects"] = {};
  for (const p of participants) {
    const fx = fxList.find((e) => e.participantId === p.id);
    if (fx) effects[p.id] = fx;
  }
  // Fundo da cena (project.view), como o RoomRenderer2D do Host lê.
  const view: any = (get(project) as any)?.view ?? {};
  return {
    type: "room_snapshot",
    roomCode: currentRoomCode(),
    sentAt: Date.now(),
    canvas: { width: ROOM_CANVAS.width, height: ROOM_CANVAS.height },
    scene: {
      backgroundMode: view.backgroundMode ?? "transparent",
      backgroundColor: view.backgroundColor ?? "#00FF00",
    },
    participants,
    avatars,
    effects,
    requiredAssets,
  };
}

async function broadcast(message: string, highPriority = true): Promise<void> {
  if (!isTauri()) return;
  try { await invoke("companion_server_broadcast", { message, highPriority }); }
  catch (e) { console.error("[host] broadcast falhou", e); }
}

let lastSnapshotSig = "";

/**
 * Envia a cena atual aos Companions. `force` (connect / botão "Reenviar cena")
 * sempre envia; caso contrário, dedupa: não reenvia um snapshot idêntico ao
 * último (evita flood de payloads grandes a cada edição irrelevante).
 */
export async function broadcastRoomSnapshot(force = false): Promise<void> {
  const snap = buildRoomSnapshot();
  const sig = JSON.stringify({ ...snap, sentAt: 0 });
  if (!force && sig === lastSnapshotSig) return;
  lastSnapshotSig = sig;
  const json = JSON.stringify(snap);
  console.log("[companion-sync] room_snapshot bytes=", json.length, "assets=", snap.requiredAssets?.length ?? 0);
  await broadcast(json, false); // snapshot leve = baixa prioridade
}

// Fila de envio de assets (imagens) com throttle — evita mandar vários MB de uma
// vez e saturar a VPN. Uma imagem por vez, com intervalo; fala/reação (alta
// prioridade) passam na frente.
const assetSendQueue: string[] = [];
let assetTimer: any = 0;

function enqueueAssets(ids: string[]): void {
  for (const id of ids) if (typeof id === "string" && id && !assetSendQueue.includes(id)) assetSendQueue.push(id);
  if (!assetTimer) pumpAssets();
}
function pumpAssets(): void {
  const id = assetSendQueue.shift();
  if (!id) { assetTimer = 0; return; }
  const dataUrl = assetRegistry.get(id);
  if (dataUrl) {
    console.log("[companion-sync] room_asset", id, "bytes=", dataUrl.length);
    broadcast(JSON.stringify({ type: "room_asset", assetId: id, dataUrl, byteLength: dataUrl.length }), false);
  }
  assetTimer = setTimeout(pumpAssets, 150);
}

async function broadcastParticipantSpeaking(participantId: string, isSpeaking: boolean): Promise<void> {
  // Evento leve, imediato, alta prioridade. sentAt (Date.now) permite medir a
  // latência no Companion quando no mesmo PC (mesmo relógio de parede).
  await broadcast(JSON.stringify({ type: "participant_speaking", participantId, isSpeaking, sentAt: Date.now() }), true);
}

const lastReactionAt = new Map<string, number>();
const lastShoutAt = new Map<string, number>();
const remoteVolume = new Map<string, number>(); // volume atual por usuário Companion (0..100)
let lastShoutEval = 0;

/** Volume atual estimado de um participante: Companion → volume enviado; caso contrário → mic do Host. */
function currentVolumeFor(participantId: string): number {
  const b = get(audioRouting).bindings.find((x) => x.participantId === participantId);
  if (b?.mode === "remote_companion_user" && b.externalUserId) return remoteVolume.get(b.externalUserId) ?? 0;
  return get(audioLevel);
}

/** Expressão de grito configurada para o avatar do participante (ou null). */
function shoutExpressionFor(participantId: string): string | null {
  const r = get(room);
  const p = r.participants.find((x) => x.id === participantId);
  const a = p ? r.avatars.find((x) => x.id === p.avatarId) : undefined;
  return a?.shoutExpressionId ?? null;
}

/**
 * Dispara a reação de voz de um participante (local + broadcast). `manual` ignora
 * enabled/cooldown. `expressionId` troca a face (grito) durante a reação.
 */
function fireHostReaction(participantId: string, manual = false, expressionId: string | null = null): void {
  const fx = get(participantEffects).find((e) => e.participantId === participantId);
  const vr = fx?.voiceReaction;
  const effects = vr?.effects ?? [];
  if (!effects.length && !expressionId) return;              // nada a mostrar
  if (!manual && vr && !vr.enabled && !expressionId) return; // efeitos exigem enabled; grito não
  const now = Date.now();
  const intensity = vr?.intensity ?? 70;
  const durationMs = vr?.durationMs ?? 700;
  if (!manual) {
    const last = lastReactionAt.get(participantId) ?? 0;
    if (now - last < (vr?.cooldownMs ?? 900)) return;
  }
  lastReactionAt.set(participantId, now);
  applyReaction(participantId, effects, intensity, durationMs, expressionId); // mostra no Host
  broadcast(JSON.stringify({
    type: "participant_reaction",
    participantId, effects, intensity, durationMs, expressionId, sentAt: now,
  }), true); // alta prioridade, imediato
}

/** Botão "Testar" (por participante) — sempre dispara + mostra a expressão de grito, se houver. */
export function simulateParticipantReaction(participantId: string): void {
  fireHostReaction(participantId, true, shoutExpressionFor(participantId));
}

/**
 * Avalia gritos: para cada participante FALANDO com expressão de grito configurada,
 * se o volume passou do limiar (e fora do cooldown), troca para a expressão de grito.
 * Chamado quando o volume muda (mic do Host ou volume de um Companion). Throttle interno.
 */
function evaluateShouts(): void {
  const now = Date.now();
  if (now - lastShoutEval < 80) return;
  lastShoutEval = now;
  const r = get(room);
  if (!r.enabled) return;
  const fxList = get(participantEffects);
  for (const p of r.participants) {
    if (!p.isSpeaking) continue;
    const expId = shoutExpressionFor(p.id);
    if (!expId) continue;
    const vr = fxList.find((e) => e.participantId === p.id)?.voiceReaction;
    const threshold = vr?.shoutThreshold ?? 101; // 101 = desligado
    if (currentVolumeFor(p.id) < threshold) continue;
    const dur = vr?.durationMs ?? 700;
    if (now - (lastShoutAt.get(p.id) ?? 0) < dur) continue; // não re-disparar enquanto ativo
    lastShoutAt.set(p.id, now);
    fireHostReaction(p.id, true, expId);
  }
}

let inited = false;
let snapTimer: any = 0;
const lastSpeaking = new Map<string, boolean>();

function scheduleSnapshot(): void {
  clearTimeout(snapTimer);
  // Debounce maior + dedupe (dentro de broadcastRoomSnapshot) evitam flood.
  snapTimer = setTimeout(() => { broadcastRoomSnapshot(false); }, 1200);
}

/** Liga os gatilhos automáticos de envio de cena. Idempotente; só roda no app (Tauri). */
export function initCompanionHostSync(): void {
  if (inited || !isTauri()) return;
  inited = true;

  // 1) Snapshot (leve) quando um Companion conecta.
  listen("companion://join", () => { setTimeout(() => { broadcastRoomSnapshot(true); }, 200); }).catch(() => {});

  // 1b) Companion pediu imagens que faltam no cache dele → envia com throttle.
  listen<any>("companion://request_assets", (ev) => {
    const ids = Array.isArray(ev.payload) ? ev.payload : [];
    enqueueAssets(ids);
  }).catch(() => {});

  // 1c) Volume de cada Companion → detecta grito (troca p/ expressão de grito).
  listen<any>("companion://speaking", (ev) => {
    const p = ev.payload;
    if (p?.id) remoteVolume.set(p.id, typeof p.volume === "number" ? p.volume : 0);
    evaluateShouts();
  }).catch(() => {});

  // 2) Mudanças na sala: fala imediata (mensagem leve) + snapshot visual com debounce.
  room.subscribe((r) => {
    for (const p of r.participants) {
      const prev = lastSpeaking.get(p.id);
      if (prev === undefined) { lastSpeaking.set(p.id, p.isSpeaking); continue; }
      if (prev !== p.isSpeaking) {
        lastSpeaking.set(p.id, p.isSpeaking);
        broadcastParticipantSpeaking(p.id, p.isSpeaking);
        if (p.isSpeaking) fireHostReaction(p.id); // início de fala → reação (se habilitada)
      }
    }
    scheduleSnapshot();
  });

  // 3) Mudanças de efeitos por participante e de fundo (project.view) → reenvia a cena (debounce).
  participantEffects.subscribe(() => scheduleSnapshot());
  project.subscribe(() => scheduleSnapshot());

  // 4) Grito pelo microfone do Host: avalia sempre que o volume muda.
  audioLevel.subscribe(() => evaluateShouts());
}
