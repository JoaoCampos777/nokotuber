import type { AvatarEffect, EffectType, EffectParams } from "./effectTypes";

export interface PresetDef {
  label:  string;
  params: Partial<EffectParams>;
}

export const EFFECT_LABELS: Record<EffectType, string> = {
  darken:     "Escurecer",
  jump:       "Pular",
  randomMove: "Mover aleatoriamente",
  waveMove:   "Mover em onda",
  waveRotate: "Rotacionar em onda",
};

export const EFFECT_ICONS: Record<EffectType, string> = {
  darken:     "🌑",
  jump:       "⬆️",
  randomMove: "🎲",
  waveMove:   "〰️",
  waveRotate: "🔄",
};

export const EFFECT_DESCRIPTIONS: Record<EffectType, string> = {
  darken:     "Escurece o avatar de forma pulsante",
  jump:       "Avatar sobe e desce em ciclos",
  randomMove: "Avatar treme de forma aleatória",
  waveMove:   "Avatar desliza em onda suave",
  waveRotate: "Avatar inclina levemente de um lado pro outro",
};

/** Presets por tipo de efeito. "customizado" sempre mantém valores manuais. */
export const EFFECT_PRESETS: Record<EffectType, Record<string, PresetDef>> = {
  darken: {
    leve:        { label: "Leve",        params: { intensity: 0.2, speed: 4 } },
    medio:       { label: "Médio",       params: { intensity: 0.4, speed: 6 } },
    forte:       { label: "Forte",       params: { intensity: 0.7, speed: 8 } },
    customizado: { label: "Customizado", params: {} },
  },
  jump: {
    leve:        { label: "Leve",        params: { amount: 6,  speed: 6,  smoothing: 0.3 } },
    padrao:      { label: "Padrão",      params: { amount: 12, speed: 8,  smoothing: 0.3 } },
    forte:       { label: "Forte",       params: { amount: 24, speed: 10, smoothing: 0.25 } },
    customizado: { label: "Customizado", params: {} },
  },
  randomMove: {
    deBoa:         { label: "De boa",         params: { amount: 4,  speed: 3,  smoothing: 0.5 } },
    tremendo:      { label: "Tremendo",       params: { amount: 10, speed: 12, smoothing: 0.4 } },
    tremendoMuito: { label: "Tremendo muito", params: { amount: 20, speed: 18, smoothing: 0.3 } },
    customizado:   { label: "Customizado",    params: {} },
  },
  waveMove: {
    suave:       { label: "Suave",       params: { amount: 6,  speed: 2, axis: "y" } },
    medio:       { label: "Médio",       params: { amount: 14, speed: 3, axis: "y" } },
    intenso:     { label: "Intenso",     params: { amount: 26, speed: 5, axis: "both" } },
    customizado: { label: "Customizado", params: {} },
  },
  waveRotate: {
    suave:       { label: "Suave",       params: { amount: 3,  speed: 2 } },
    medio:       { label: "Médio",       params: { amount: 8,  speed: 3 } },
    intenso:     { label: "Intenso",     params: { amount: 15, speed: 5 } },
    customizado: { label: "Customizado", params: {} },
  },
};

export const DEFAULT_PRESET: Record<EffectType, string> = {
  darken:     "medio",
  jump:       "padrao",
  randomMove: "tremendo",
  waveMove:   "suave",
  waveRotate: "suave",
};

function baseParams(type: EffectType): EffectParams {
  switch (type) {
    case "darken":     return { intensity: 0.4, speed: 6 };
    case "jump":       return { amount: 12, speed: 8,  smoothing: 0.3 };
    case "randomMove": return { amount: 10, speed: 12, smoothing: 0.4 };
    case "waveMove":   return { amount: 10, speed: 3,  axis: "y" };
    case "waveRotate": return { amount: 8,  speed: 3 };
  }
}

/** Cria um efeito novo já com preset padrão aplicado. */
export function createEffect(type: EffectType): AvatarEffect {
  const presetKey = DEFAULT_PRESET[type];
  const preset    = EFFECT_PRESETS[type][presetKey];
  return {
    id:         `effect_${type}_${crypto.randomUUID().slice(0, 8)}`,
    name:       EFFECT_LABELS[type],
    type,
    enabled:    true,
    trigger:    "talking",
    preset:     presetKey,
    transition: "smooth",
    params:     { ...baseParams(type), ...preset.params },
  };
}

/** Quais sliders cada tipo de efeito mostra. */
export function paramFieldsFor(type: EffectType): Array<keyof EffectParams> {
  switch (type) {
    case "darken":     return ["intensity", "speed"];
    case "jump":       return ["amount", "speed", "smoothing"];
    case "randomMove": return ["amount", "speed", "smoothing"];
    case "waveMove":   return ["amount", "speed", "axis"];
    case "waveRotate": return ["amount", "speed"];
  }
}