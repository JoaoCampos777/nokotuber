import type { PNGTuberProject } from "./projectTypes";
import { createEmptyProject, PROJECT_SCHEMA_VERSION } from "./projectTypes";
import type { ViewSettings } from "../view/viewTypes";
import type { AvatarEffect, EffectType, Trigger, Transition, WaveAxis } from "../effects/effectTypes";

const VALID_TYPES:       EffectType[]  = ["darken", "jump", "randomMove", "waveMove", "waveRotate"];
const VALID_TRIGGERS:    Trigger[]     = ["always", "idle", "talking", "blink", "happy", "angry", "sad", "surprised"];
const VALID_TRANSITIONS: Transition[]  = ["none", "smooth", "bounce"];
const VALID_AXES:        WaveAxis[]     = ["x", "y", "both"];

function clampNum(v: any, min: number, max: number, def: number): number {
  return typeof v === "number" && !isNaN(v) ? Math.max(min, Math.min(max, v)) : def;
}

/**
 * Migra um projeto (possivelmente antigo) para o schema atual.
 * Preenche view/effects, valida ranges e nunca quebra.
 */
export function migrateProject(raw: any): PNGTuberProject {
  const base = createEmptyProject();
  if (!raw || typeof raw !== "object") return base;

  const p: any = { ...base, ...raw };

  // Sub-objetos com merge seguro
  p.images      = { ...base.images,      ...(raw.images      ?? {}) };
  p.blinkConfig = { ...base.blinkConfig, ...(raw.blinkConfig ?? {}) };
  p.audioConfig = { ...base.audioConfig, ...(raw.audioConfig ?? {}) };

  // view
  const rv = raw.view ?? {};
  const view: ViewSettings = {
    avatarSizeMode: rv.avatarSizeMode === "manual" ? "manual" : "auto",
    sizeMultiplier: clampNum(rv.sizeMultiplier, 0.25, 3, 1),
    positionX:      clampNum(rv.positionX, -1000, 1000, 0),
    positionY:      clampNum(rv.positionY, -1000, 1000, 0),
    movementScale:  clampNum(rv.movementScale, 0, 3, 1),
    backgroundMode: ["transparent", "color", "chroma"].includes(rv.backgroundMode) ? rv.backgroundMode : "transparent",
    backgroundColor: typeof rv.backgroundColor === "string" ? rv.backgroundColor : "#00FF00",
    filters: {
      hue:        clampNum(rv.filters?.hue, -180, 180, 0),
      saturation: clampNum(rv.filters?.saturation, 0, 3, 1),
      brightness: clampNum(rv.filters?.brightness, 0, 3, 1),
    },
  };
  p.view = view;

  // effects
  const rawEffects = Array.isArray(raw.effects) ? raw.effects : [];
  p.effects = rawEffects.map(sanitizeEffect).filter(Boolean) as AvatarEffect[];

  p.projectVersion   = PROJECT_SCHEMA_VERSION;
  p.useDefaultAvatar = typeof raw.useDefaultAvatar === "boolean" ? raw.useDefaultAvatar : base.useDefaultAvatar;

  return p as PNGTuberProject;
}

function sanitizeEffect(e: any): AvatarEffect | null {
  if (!e || typeof e !== "object") return null;
  const type: EffectType = VALID_TYPES.includes(e.type) ? e.type : "randomMove";
  return {
    id:         typeof e.id === "string"   ? e.id   : `effect_${type}_${Math.random().toString(36).slice(2, 10)}`,
    name:       typeof e.name === "string" ? e.name : type,
    type,
    enabled:    typeof e.enabled === "boolean" ? e.enabled : true,
    trigger:    VALID_TRIGGERS.includes(e.trigger) ? e.trigger : "talking",
    preset:     typeof e.preset === "string" ? e.preset : "customizado",
    transition: VALID_TRANSITIONS.includes(e.transition) ? e.transition : "smooth",
    params: {
      amount:    clampNum(e.params?.amount, 0, 100, 10),
      speed:     clampNum(e.params?.speed, 0, 60, 8),
      smoothing: clampNum(e.params?.smoothing, 0, 0.99, 0.4),
      intensity: clampNum(e.params?.intensity, 0, 1, 0.4),
      axis:      VALID_AXES.includes(e.params?.axis) ? e.params.axis : "y",
    },
  };
}