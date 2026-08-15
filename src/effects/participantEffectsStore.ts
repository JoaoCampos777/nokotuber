import { writable, get } from "svelte/store";
import type { ParticipantEffects, ParticipantEffectKey, EffectPreset, ParticipantVoiceReaction } from "./participantEffects";
import { defaultParticipantEffects, normalizeParticipantEffects } from "./participantEffects";
import type { VoiceReactionEffectType } from "../audio/voiceReactionTypes";
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
      if (Array.isArray(arr)) return arr.map((e) => normalizeParticipantEffects(e));
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

// ─── Reação de voz por participante ───
export function setVoiceReactionEnabled(participantId: string, enabled: boolean): void {
  participantEffects.update((list) =>
    list.map((e) => e.participantId === participantId
      ? { ...e, voiceReaction: { ...e.voiceReaction, enabled } } : e));
}

export function toggleVoiceReactionEffect(participantId: string, effect: VoiceReactionEffectType): void {
  participantEffects.update((list) =>
    list.map((e) => {
      if (e.participantId !== participantId) return e;
      const has = e.voiceReaction.effects.includes(effect);
      const effects = has ? e.voiceReaction.effects.filter((x) => x !== effect) : [...e.voiceReaction.effects, effect];
      return { ...e, voiceReaction: { ...e.voiceReaction, effects } };
    }));
}

export function updateVoiceReaction(participantId: string, patch: Partial<ParticipantVoiceReaction>): void {
  participantEffects.update((list) =>
    list.map((e) => e.participantId === participantId
      ? { ...e, voiceReaction: { ...e.voiceReaction, ...patch } } : e));
}

/** Copia presets+enabled de um participante para outro (mantém o participantId do destino). */
export function copyEffectsTo(fromId: string, toId: string): void {
  participantEffects.update((list) => {
    const src = list.find((e) => e.participantId === fromId);
    if (!src) return list;
    return list.map((e) => e.participantId === toId
      ? { ...e, enabled: src.enabled, presets: JSON.parse(JSON.stringify(src.presets)), voiceReaction: JSON.parse(JSON.stringify(src.voiceReaction)) }
      : e);
  });
}

export function resetParticipantEffects(participantId: string): void {
  participantEffects.update((list) =>
    list.map((e) => (e.participantId === participantId ? defaultParticipantEffects(participantId) : e)));
}

/** Aplica os efeitos por participante vindos de um projeto carregado (.noko). */
export function applyParticipantEffects(raw: any): void {
  participantEffects.set(Array.isArray(raw) ? raw.map((e) => normalizeParticipantEffects(e)) : []);
}
