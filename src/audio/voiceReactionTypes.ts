export type VoiceReactionEffectType =
  | "shake"
  | "strongShake"
  | "randomMovement"
  | "scalePulse"
  | "expressionSwap"
  | "colorFlash";

export interface VoiceReactionRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerThreshold: number;            // 0..100
  durationMs: number;
  cooldownMs: number;
  effects: VoiceReactionEffectType[];  // vários efeitos simultâneos
  intensity: number;                   // 0..100
  temporaryExpressionId?: string | null;
}

export const EFFECT_TYPE_OPTIONS: { value: VoiceReactionEffectType; label: string }[] = [
  { value: "shake",          label: "Tremor leve" },
  { value: "strongShake",    label: "Tremor forte" },
  { value: "randomMovement", label: "Movimento aleatório" },
  { value: "scalePulse",     label: "Pulso de escala" },
  { value: "expressionSwap", label: "Trocar expressão" },
  { value: "colorFlash",     label: "Flash visual" },
];

export function defaultReactionRule(): VoiceReactionRule {
  return {
    id: "rule_main",
    name: "Reação de voz",
    enabled: true,
    triggerThreshold: 75,
    durationMs: 900,
    cooldownMs: 1200,
    effects: ["strongShake"],
    intensity: 80,
    temporaryExpressionId: null,
  };
}