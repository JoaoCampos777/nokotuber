export interface EffectPreset {
  enabled: boolean;
  intensity: number; // 0..10
  speed: number;     // multiplicador (0.1..3)
}

export type ParticipantEffectKey =
  | "talkBounce" | "talkShake" | "idleBreathing" | "headBob" | "highlightWhenSpeaking";

export interface ParticipantEffectPresets {
  talkBounce: EffectPreset;
  talkShake: EffectPreset;
  idleBreathing: EffectPreset;
  headBob: EffectPreset;
  highlightWhenSpeaking: EffectPreset;
}

import type { VoiceReactionEffectType } from "../audio/voiceReactionTypes";

/** Reação de voz por participante (efeitos ricos, disparados ao falar/simular). */
export interface ParticipantVoiceReaction {
  enabled: boolean;
  effects: VoiceReactionEffectType[]; // shake, strongShake, randomMovement, scalePulse, expressionSwap, colorFlash
  intensity: number;  // 0..100
  durationMs: number; // quanto dura a reação
  cooldownMs: number; // intervalo mínimo entre reações automáticas (por fala)
  shoutThreshold: number; // 0..100 — volume p/ considerar "grito" (troca p/ shoutExpression)
}

export function defaultParticipantVoiceReaction(): ParticipantVoiceReaction {
  return { enabled: false, effects: ["strongShake"], intensity: 70, durationMs: 700, cooldownMs: 900, shoutThreshold: 70 };
}

/** Reação ativa no momento (runtime), aplicada pelo renderer. */
export interface ActiveRoomReaction {
  participantId: string;
  effects: VoiceReactionEffectType[];
  intensity: number;  // 0..100
  startedAt: number;  // performance.now() LOCAL (cada processo usa o seu relógio)
  durationMs: number;
  expressionId?: string | null; // troca a face do avatar durante a reação (grito)
}

export interface ParticipantEffects {
  participantId: string;
  enabled: boolean;
  presets: ParticipantEffectPresets;
  voiceReaction: ParticipantVoiceReaction;
}

export const PARTICIPANT_EFFECTS_VERSION = "1.0.0";

export function defaultEffectPreset(over?: Partial<EffectPreset>): EffectPreset {
  return { enabled: false, intensity: 5, speed: 1, ...over };
}

/** Defaults sensatos: bounce + respiração ligados, resto desligado. */
export function defaultParticipantEffects(participantId: string): ParticipantEffects {
  return {
    participantId,
    enabled: true,
    presets: {
      talkBounce:            { enabled: true,  intensity: 6, speed: 1 },
      talkShake:             { enabled: false, intensity: 3, speed: 1 },
      idleBreathing:         { enabled: true,  intensity: 3, speed: 0.5 },
      headBob:               { enabled: false, intensity: 4, speed: 0.6 },
      highlightWhenSpeaking: { enabled: false, intensity: 4, speed: 1 },
    },
    voiceReaction: defaultParticipantVoiceReaction(),
  };
}

/** Garante que uma entrada (possivelmente de versão antiga) tenha todos os campos. */
export function normalizeParticipantEffects(raw: any, participantId?: string): ParticipantEffects {
  const base = defaultParticipantEffects(participantId ?? raw?.participantId ?? "");
  if (!raw || typeof raw !== "object") return base;
  const presets = { ...base.presets };
  for (const k of PARTICIPANT_EFFECT_KEYS) {
    if (raw.presets && raw.presets[k]) presets[k] = { ...base.presets[k], ...raw.presets[k] };
  }
  const vr = raw.voiceReaction && typeof raw.voiceReaction === "object"
    ? { ...base.voiceReaction, ...raw.voiceReaction, effects: Array.isArray(raw.voiceReaction.effects) ? raw.voiceReaction.effects : base.voiceReaction.effects }
    : base.voiceReaction;
  return {
    participantId: raw.participantId ?? base.participantId,
    enabled: raw.enabled !== undefined ? !!raw.enabled : base.enabled,
    presets,
    voiceReaction: vr,
  };
}

export const PARTICIPANT_EFFECT_KEYS: ParticipantEffectKey[] = [
  "talkBounce", "talkShake", "idleBreathing", "headBob", "highlightWhenSpeaking",
];

export const PARTICIPANT_EFFECT_LABELS: Record<ParticipantEffectKey, string> = {
  talkBounce: "Pulo ao falar",
  talkShake: "Tremor ao falar",
  idleBreathing: "Respiração (parado)",
  headBob: "Balanço de cabeça",
  highlightWhenSpeaking: "Destaque ao falar",
};