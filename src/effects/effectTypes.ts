export type EffectType  = "darken" | "jump" | "randomMove" | "waveMove" | "waveRotate";
export type Trigger     = "always" | "idle" | "talking" | "blink" | "happy" | "angry" | "sad" | "surprised";
export type Transition  = "none" | "smooth" | "bounce";
export type WaveAxis    = "x" | "y" | "both";

export interface EffectParams {
  amount?:    number;
  speed?:     number;
  smoothing?: number;
  intensity?: number;
  axis?:      WaveAxis;
}

export interface AvatarEffect {
  id:         string;
  name:       string;
  type:       EffectType;
  enabled:    boolean;
  trigger:    Trigger;
  preset:     string;
  transition: Transition;
  params:     EffectParams;
}

/** Resultado combinado dos efeitos, aplicado no container do avatar. */
export interface EffectTransform {
  x:          number;
  y:          number;
  scaleX:     number;
  scaleY:     number;
  rotation:   number;  // radianos
  alpha:      number;
  brightness: number;  // multiplicador (1 = normal)
}

export function identityTransform(): EffectTransform {
  return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, alpha: 1, brightness: 1 };
}

export const DEFAULT_EFFECTS: AvatarEffect[] = [];