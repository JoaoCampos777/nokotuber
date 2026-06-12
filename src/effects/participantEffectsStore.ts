import { writable, get } from "svelte/store";
import type { ParticipantEffects, ParticipantEffectKey, EffectPreset } from "./participantEffects";
import { defaultParticipantEffects } from "./participantEffects";
import { room } from "../room/roomStore";

const KEY = "nokotuber:participantEffects:v1";

function isPerfWin(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.location.search.includes("performance")) return true;
    if (window.location.hash.includes("performance"))   return true;
    const label = (window as any)?.__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
    return label === "performance";
  } catch { return false; }
}

function load(): ParticipantEffects[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

export const participantEffects = writable<ParticipantEffects[]>(load());

if (!isPerfWin()) {
  participantEffects.subscribe((list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} });
}

// Garante uma entrada por participante (default) e remove órfãos.
room.subscribe((r) => {
  const ids = r.participants.map((p) => p.id);
  const cur = get(participantEffects);
  let list = cur.filter((e) => ids.includes(e.participantId));
  let changed = list.length !== cur.length;
  for (const id of ids) {
    if (!list.some((e) => e.participantId === id)) {
      list = [...list, defaultParticipantEffects(id)];
      changed = true;
    }
  }
  if (changed) participantEffects.set(list);
});

// ─── Ações ───
export function getEffects(participantId: string): ParticipantEffects | undefined {
  return get(participantEffects).find((e) => e.participantId === participantId);
}

export function setParticipantEffectsEnabled(participantId: string, enabled: boolean): void {
  participantEffects.update((list) =>
    list.map((e) => (e.participantId === participantId ? { ...e, enabled } : e)));
}

export function setPresetEnabled(participantId: string, key: ParticipantEffectKey, enabled: boolean): void {
  participantEffects.update((list) =>
    list.map((e) => e.participantId === participantId
      ? { ...e, presets: { ...e.presets, [key]: { ...e.presets[key], enabled } } }
      : e));
}

export function updatePreset(participantId: string, key: ParticipantEffectKey, patch: Partial<EffectPreset>): void {
  participantEffects.update((list) =>
    list.map((e) => e.participantId === participantId
      ? { ...e, presets: { ...e.presets, [key]: { ...e.presets[key], ...patch } } }
      : e));
}

/** Copia presets+enabled de um participante para outro (mantém o participantId do destino). */
export function copyEffectsTo(fromId: string, toId: string): void {
  participantEffects.update((list) => {
    const src = list.find((e) => e.participantId === fromId);
    if (!src) return list;
    return list.map((e) => e.participantId === toId
      ? { ...e, enabled: src.enabled, presets: JSON.parse(JSON.stringify(src.presets)) }
      : e);
  });
}

export function resetParticipantEffects(participantId: string): void {
  participantEffects.update((list) =>
    list.map((e) => (e.participantId === participantId ? defaultParticipantEffects(participantId) : e)));
}

/** Aplica os efeitos por participante vindos de um projeto carregado (.noko). */
export function applyParticipantEffects(raw: any): void {
  participantEffects.set(Array.isArray(raw) ? raw : []);
}
