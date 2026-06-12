import { writable, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { CompanionRoomState } from "./companionTypes";
import { defaultCompanionRoom, DEFAULT_COMPANION_PORT } from "./companionTypes";
import { emitRemoteCompanionSpeakingEvent } from "../audio/remoteCompanionProvider";
import { bindRemoteCompanionUser, unbindRemoteCompanionUser } from "../audio/audioBindingStore";

const STORAGE_KEY = "nokotuber:companionRoom:v1";

function isPerfWindow(): boolean {
  try {
    const s = (window.location.search || "") + (window.location.hash || "");
    if (s.includes("performance")) return true;
    const label = (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
    return label === "performance";
  } catch { return false; }
}
function isTauri(): boolean { return typeof (window as any).__TAURI_INTERNALS__ !== "undefined"; }

function normalizeRoom(raw: any): CompanionRoomState {
  const base = defaultCompanionRoom();
  if (!raw || typeof raw !== "object") return base;
  const participants = Array.isArray(raw.participants)
    ? raw.participants.map((p: any) => ({
        id: String(p?.id ?? ""), displayName: String(p?.displayName ?? "Participante"),
        connected: false, isSpeaking: false, volume: 0, lastSeenAt: Date.now(),
        boundParticipantId: p?.boundParticipantId ?? undefined,
      })).filter((p: any) => p.id)
    : [];
  return {
    ...base, enabled: !!raw.enabled, roomId: raw.roomId ?? base.roomId,
    hostPort: typeof raw.hostPort === "number" ? raw.hostPort : DEFAULT_COMPANION_PORT,
    vpnIp: typeof raw.vpnIp === "string" ? raw.vpnIp : "",
    localIp: undefined, status: raw.enabled ? "hosting" : "disabled", serverRunning: false, participants,
  };
}
function loadPersisted(): CompanionRoomState {
  if (isPerfWindow()) return defaultCompanionRoom();
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? normalizeRoom(JSON.parse(raw)) : defaultCompanionRoom(); }
  catch { return defaultCompanionRoom(); }
}

export const companionRoom = writable<CompanionRoomState>(loadPersisted());
if (!isPerfWindow()) companionRoom.subscribe((r) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); } catch {} });

function randomCode(n = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s;
}

export function createCompanionRoom(): void {
  companionRoom.update((r) => ({ ...r, enabled: true, roomId: r.roomId ?? randomCode(), status: "hosting", error: undefined }));
}
export function setHostPort(p: number): void { companionRoom.update((s) => ({ ...s, hostPort: p || DEFAULT_COMPANION_PORT })); }
export function setVpnIp(ip: string): void { companionRoom.update((s) => ({ ...s, vpnIp: ip.trim() })); }

export async function startCompanionServer(): Promise<void> {
  const r = get(companionRoom);
  if (!isTauri()) { companionRoom.update((s) => ({ ...s, error: "O servidor só roda no app (Tauri)." })); return; }
  try {
    const info: any = await invoke("companion_server_start", { port: r.hostPort, roomCode: r.roomId ?? "" });
    companionRoom.update((s) => ({ ...s, serverRunning: true, localIp: info?.ip, error: undefined }));
  } catch (e: any) {
    companionRoom.update((s) => ({ ...s, serverRunning: false, error: `Não foi possível iniciar o servidor: ${e?.message ?? e}` }));
  }
}
export async function stopCompanionServer(): Promise<void> {
  if (isTauri()) { try { await invoke("companion_server_stop"); } catch {} }
  companionRoom.update((s) => ({ ...s, serverRunning: false }));
}

export function endCompanionRoom(): void {
  stopCompanionServer();
  get(companionRoom).participants.forEach((p) => { if (p.boundParticipantId) unbindRemoteCompanionUser(p.boundParticipantId); });
  companionRoom.set(defaultCompanionRoom());
}

export function addRemoteParticipant(id: string, displayName: string): void {
  companionRoom.update((r) => {
    if (!r.enabled) return r;
    if (r.participants.some((p) => p.id === id))
      return { ...r, participants: r.participants.map((p) => p.id === id ? { ...p, connected: true, displayName, lastSeenAt: Date.now() } : p) };
    return { ...r, participants: [...r.participants, { id, displayName, connected: true, isSpeaking: false, volume: 0, lastSeenAt: Date.now() }] };
  });
}
export function markRemoteDisconnected(id: string): void {
  companionRoom.update((r) => ({ ...r, participants: r.participants.map((p) => p.id === id ? { ...p, connected: false, isSpeaking: false } : p) }));
}
export function removeRemoteParticipant(id: string): void {
  companionRoom.update((r) => {
    const p = r.participants.find((x) => x.id === id);
    if (p?.boundParticipantId) unbindRemoteCompanionUser(p.boundParticipantId);
    return { ...r, participants: r.participants.filter((x) => x.id !== id) };
  });
}
export function setRemoteParticipantSpeaking(id: string, isSpeaking: boolean, volume?: number): void {
  let name = id;
  companionRoom.update((r) => ({ ...r, participants: r.participants.map((p) => {
    if (p.id !== id) return p; name = p.displayName;
    return { ...p, isSpeaking, volume: volume ?? p.volume, lastSeenAt: Date.now() };
  }) }));
  emitRemoteCompanionSpeakingEvent({ remoteUserId: id, displayName: name, isSpeaking, volume });
}
export function bindRemoteToParticipant(remoteId: string, participantId: string): void {
  let name = remoteId;
  companionRoom.update((r) => ({ ...r, participants: r.participants.map((p) => {
    if (p.id === remoteId) { name = p.displayName; return { ...p, boundParticipantId: participantId }; }
    if (p.boundParticipantId === participantId) return { ...p, boundParticipantId: undefined };
    return p;
  }) }));
  bindRemoteCompanionUser(participantId, remoteId, name);
}
export function unbindRemote(remoteId: string): void {
  companionRoom.update((r) => ({ ...r, participants: r.participants.map((p) => {
    if (p.id !== remoteId) return p;
    if (p.boundParticipantId) unbindRemoteCompanionUser(p.boundParticipantId);
    return { ...p, boundParticipantId: undefined };
  }) }));
}
export function applyCompanionRoom(raw: any): void { companionRoom.set(normalizeRoom(raw)); }
export function resetCompanionRoom(): void { companionRoom.set(defaultCompanionRoom()); }

// Eventos do servidor local (Rust) — só no host/editor, ambiente Tauri
if (!isPerfWindow() && isTauri()) {
  listen<any>("companion://join", (ev) => { const p = ev.payload; if (p?.id) addRemoteParticipant(p.id, p.name ?? "Participante"); });
  listen<any>("companion://speaking", (ev) => { const p = ev.payload; if (p?.id) setRemoteParticipantSpeaking(p.id, !!p.isSpeaking, typeof p.volume === "number" ? p.volume : undefined); });
  listen<any>("companion://leave", (ev) => { const p = ev.payload; if (p?.id) markRemoteDisconnected(p.id); });
}