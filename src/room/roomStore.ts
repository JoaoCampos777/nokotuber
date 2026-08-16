import { writable, get, derived } from "svelte/store";
import type { RoomSettings, RoomParticipant, RoomAvatar, RoomExpression, AudioBindingMode } from "./roomTypes";
import { ROOM_CANVAS, ROOM_VERSION, ROOM_MAX_FUTURE } from "./roomTypes";
import { emptyExpressionImages } from "../project/expressionTypes";
import type { ExpressionImageSlot } from "../project/expressionTypes";
import type { Addon } from "../addons/addonTypes";
import { defaultAddon, normalizeAddons } from "../addons/addonTypes";

const ROOM_KEY = "nokotuber:room:v1";

function uid(p: string): string {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function makeAvatar(id: string, name: string): RoomAvatar {
  return { id, name, images: emptyExpressionImages(), expressions: [], activeExpressionId: null, shoutExpressionId: null, addons: [] };
}

/** Normaliza um avatar salvo (tolerante a versões sem expressões). */
function normalizeAvatar(a: any): RoomAvatar {
  const expressions: RoomExpression[] = Array.isArray(a?.expressions)
    ? a.expressions.map((e: any) => ({
        id: typeof e?.id === "string" ? e.id : uid("exp"),
        name: typeof e?.name === "string" ? e.name : "Expressão",
        images: { ...emptyExpressionImages(), ...(e?.images ?? {}) },
        hotkey: typeof e?.hotkey === "string" ? e.hotkey : null,
      }))
    : [];
  const has = (id: any) => typeof id === "string" && expressions.some((e) => e.id === id);
  return {
    id: a?.id ?? uid("avatar"),
    name: a?.name ?? "Avatar",
    images: { ...emptyExpressionImages(), ...(a?.images ?? {}) },
    expressions,
    activeExpressionId: has(a?.activeExpressionId) ? a.activeExpressionId : null,
    shoutExpressionId: has(a?.shoutExpressionId) ? a.shoutExpressionId : null,
    addons: normalizeAddons(a?.addons),
  };
}

function makeParticipant(id: string, num: number, avatarId: string, x: number, zIndex: number): RoomParticipant {
  return {
    id,
    name: `Pessoa ${num}`,
    enabled: true,
    avatarId,
    audioSourceId: "default",
    audioMode: "shared_microphone",
    position: { x, y: ROOM_CANVAS.height * 0.62 },
    scale: 1,
    rotation: 0,
    opacity: 1,
    zIndex,
    mirrorX: false,
    isSpeaking: false,
    expressionStateId: "idle",
  };
}

function defaultRoom(): RoomSettings {
  return {
    enabled: false,
    version: ROOM_VERSION,
    maxParticipants: 2,
    layoutMode: "manual",
    avatars: [makeAvatar("avatar_1", "Avatar 1"), makeAvatar("avatar_2", "Avatar 2")],
    participants: [
      makeParticipant("participant_1", 1, "avatar_1", ROOM_CANVAS.width * 0.32, 0),
      makeParticipant("participant_2", 2, "avatar_2", ROOM_CANVAS.width * 0.68, 1),
    ],
  };
}

/** Mescla dados salvos com o padrão (tolerante a versões antigas/parciais). */
function mergeRoom(raw: any): RoomSettings {
  const base = defaultRoom();
  if (!raw || typeof raw !== "object") return base;
  return {
    enabled: !!raw.enabled,
    version: ROOM_VERSION,
    maxParticipants: raw.maxParticipants ?? base.maxParticipants,
    layoutMode: raw.layoutMode === "preset" ? "preset" : "manual",
    avatars: Array.isArray(raw.avatars) && raw.avatars.length
      ? raw.avatars.map((a: any) => normalizeAvatar(a))
      : base.avatars,
    participants: Array.isArray(raw.participants) && raw.participants.length
      ? raw.participants.map((p: any, i: number) => ({
          ...makeParticipant(p.id ?? `participant_${i + 1}`, i + 1, p.avatarId ?? `avatar_${i + 1}`, p.position?.x ?? ROOM_CANVAS.width * 0.5, typeof p.zIndex === "number" ? p.zIndex : i),
          ...p,
          id: p.id ?? `participant_${i + 1}`,
          position: { x: p.position?.x ?? ROOM_CANVAS.width * 0.5, y: p.position?.y ?? ROOM_CANVAS.height * 0.62 },
          isSpeaking: false,
          audioMode: (p.audioMode as AudioBindingMode) ?? "shared_microphone",
        }))
      : base.participants,
  };
}

function loadRoom(): RoomSettings {
  try {
    const raw = localStorage.getItem(ROOM_KEY);
    if (raw) return mergeRoom(JSON.parse(raw));
  } catch {}
  return defaultRoom();
}

function isPerfWin(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.location.search.includes("performance")) return true;
    if (window.location.hash.includes("performance"))   return true;
    const label = (window as any)?.__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
    return label === "performance";
  } catch { return false; }
}

export const room = writable<RoomSettings>(loadRoom());

// Auto-salva só no Editor (a janela de performance recebe via sync futuro)
if (!isPerfWin()) {
  room.subscribe((r) => { try { localStorage.setItem(ROOM_KEY, JSON.stringify(r)); } catch {} });
}

/** Participantes habilitados, ordenados por zIndex (para o renderer). */
export const visibleParticipants = derived(room, ($r) =>
  $r.participants.filter((p) => p.enabled).sort((a, b) => a.zIndex - b.zIndex)
);

// ─── Modo ───
export function enableRoomMode(): void  { room.update((r) => ({ ...r, enabled: true })); }
export function disableRoomMode(): void { room.update((r) => ({ ...r, enabled: false })); }
export function toggleRoomMode(): void  { room.update((r) => ({ ...r, enabled: !r.enabled })); }

// ─── Participantes ───
export function updateParticipant(id: string, patch: Partial<RoomParticipant>): void {
  room.update((r) => ({
    ...r,
    participants: r.participants.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }));
}

export function setParticipantSpeaking(id: string, speaking: boolean): void {
  updateParticipant(id, { isSpeaking: speaking });
}

export function centerParticipant(id: string): void {
  updateParticipant(id, { position: { x: ROOM_CANVAS.width / 2, y: ROOM_CANVAS.height * 0.62 } });
}

export function resetParticipantTransform(id: string): void {
  updateParticipant(id, { scale: 1, rotation: 0, opacity: 1, mirrorX: false });
}

/** Adiciona um participante (id único). Retorna o id do novo participante, ou null no limite. */
export function addParticipant(): string | null {
  const r = get(room);
  if (r.participants.length >= ROOM_MAX_FUTURE) return null;
  const num = r.participants.length + 1;
  const pid = uid("participant");
  const avatarId = uid("avatar");
  const maxZ = r.participants.reduce((m, p) => Math.max(m, p.zIndex), -1);
  // Distribui horizontalmente para o novo não nascer exatamente sobre outro.
  const x = ROOM_CANVAS.width * (0.5 + ((num % 2 === 0 ? 1 : -1) * 0.12 * Math.ceil(num / 3)));
  room.update((cur) => ({
    ...cur,
    avatars: [...cur.avatars, makeAvatar(avatarId, `Avatar ${num}`)],
    participants: [...cur.participants, makeParticipant(pid, num, avatarId, Math.max(0, Math.min(ROOM_CANVAS.width, x)), maxZ + 1)],
  }));
  return pid;
}

/** Move um participante uma camada acima/abaixo (troca zIndex com o vizinho). */
export function moveParticipantLayer(id: string, dir: -1 | 1): void {
  room.update((r) => {
    const sorted = [...r.participants].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((p) => p.id === id);
    const swapWith = idx + dir;
    if (idx < 0 || swapWith < 0 || swapWith >= sorted.length) return r;
    const a = sorted[idx], b = sorted[swapWith];
    return {
      ...r,
      participants: r.participants.map((p) =>
        p.id === a.id ? { ...p, zIndex: b.zIndex } : p.id === b.id ? { ...p, zIndex: a.zIndex } : p),
    };
  });
}

export function removeParticipant(id: string): void {
  room.update((r) => {
    if (r.participants.length <= 1) return r;
    return { ...r, participants: r.participants.filter((p) => p.id !== id) };
  });
}

// ─── Avatares (imagens por participante) ───
export function updateAvatar(avatarId: string, patch: Partial<RoomAvatar>): void {
  room.update((r) => ({
    ...r,
    avatars: r.avatars.map((a) => (a.id === avatarId ? { ...a, ...patch } : a)),
  }));
}

export function setAvatarImage(avatarId: string, slot: ExpressionImageSlot, url: string): void {
  room.update((r) => ({
    ...r,
    avatars: r.avatars.map((a) => (a.id === avatarId ? { ...a, images: { ...a.images, [slot]: url } } : a)),
  }));
}

export function clearAvatarImage(avatarId: string, slot: ExpressionImageSlot): void {
  room.update((r) => ({
    ...r,
    avatars: r.avatars.map((a) => (a.id === avatarId ? { ...a, images: { ...a.images, [slot]: null } } : a)),
  }));
}

export function getAvatar(avatarId: string): RoomAvatar | undefined {
  return get(room).avatars.find((a) => a.id === avatarId);
}

// ─── Expressões por avatar (Fase 2B) ───
function mapAvatar(avatarId: string, fn: (a: RoomAvatar) => RoomAvatar): void {
  room.update((r) => ({ ...r, avatars: r.avatars.map((a) => (a.id === avatarId ? fn(a) : a)) }));
}
function mapExpression(avatarId: string, expId: string, fn: (e: RoomExpression) => RoomExpression): void {
  mapAvatar(avatarId, (a) => ({ ...a, expressions: (a.expressions ?? []).map((e) => (e.id === expId ? fn(e) : e)) }));
}

export function addRoomExpression(avatarId: string, name = "Nova expressão"): string {
  const id = uid("exp");
  mapAvatar(avatarId, (a) => ({
    ...a,
    expressions: [...(a.expressions ?? []), { id, name, images: emptyExpressionImages(), hotkey: null }],
  }));
  return id;
}
export function removeRoomExpression(avatarId: string, expId: string): void {
  mapAvatar(avatarId, (a) => ({
    ...a,
    expressions: (a.expressions ?? []).filter((e) => e.id !== expId),
    activeExpressionId: a.activeExpressionId === expId ? null : a.activeExpressionId,
    shoutExpressionId: a.shoutExpressionId === expId ? null : a.shoutExpressionId,
  }));
}
export function renameRoomExpression(avatarId: string, expId: string, name: string): void {
  mapExpression(avatarId, expId, (e) => ({ ...e, name }));
}
export function setRoomExpressionImage(avatarId: string, expId: string, slot: ExpressionImageSlot, url: string): void {
  mapExpression(avatarId, expId, (e) => ({ ...e, images: { ...e.images, [slot]: url } }));
}
export function clearRoomExpressionImage(avatarId: string, expId: string, slot: ExpressionImageSlot): void {
  mapExpression(avatarId, expId, (e) => ({ ...e, images: { ...e.images, [slot]: null } }));
}
export function setRoomExpressionHotkey(avatarId: string, expId: string, hotkey: string | null): void {
  mapExpression(avatarId, expId, (e) => ({ ...e, hotkey }));
}
export function setActiveRoomExpression(avatarId: string, expId: string | null): void {
  mapAvatar(avatarId, (a) => ({ ...a, activeExpressionId: expId }));
}
export function setShoutExpression(avatarId: string, expId: string | null): void {
  mapAvatar(avatarId, (a) => ({ ...a, shoutExpressionId: expId }));
}

// ─── Add-ons por avatar (Fase 3) ───
function mapAddon(avatarId: string, addonId: string, fn: (ad: Addon) => Addon): void {
  mapAvatar(avatarId, (a) => ({ ...a, addons: (a.addons ?? []).map((ad) => (ad.id === addonId ? fn(ad) : ad)) }));
}
export function addRoomAddon(avatarId: string, name = "Acessório"): string {
  const ad = defaultAddon(name);
  mapAvatar(avatarId, (a) => ({ ...a, addons: [...(a.addons ?? []), ad] }));
  return ad.id;
}
export function removeRoomAddon(avatarId: string, addonId: string): void {
  mapAvatar(avatarId, (a) => ({ ...a, addons: (a.addons ?? []).filter((ad) => ad.id !== addonId) }));
}
export function updateRoomAddon(avatarId: string, addonId: string, patch: Partial<Addon>): void {
  mapAddon(avatarId, addonId, (ad) => ({ ...ad, ...patch }));
}

export function resetRoom(): void { room.set(defaultRoom()); }

/** Aplica dados de sala vindos de um projeto carregado (.noko). */
export function applyRoom(raw: any): void { room.set(mergeRoom(raw)); }
