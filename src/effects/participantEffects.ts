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

export interface ParticipantEffects {
  participantId: string;
  enabled: boolean;
  presets: ParticipantEffectPresets;
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