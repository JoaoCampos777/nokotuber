import type { AvatarEffect, EffectTransform, Trigger, Transition } from "./effectTypes";
import { identityTransform } from "./effectTypes";
import type { AvatarState } from "../avatar/avatarController";

interface RandomState { tx: number; ty: number; cx: number; cy: number; next: number; }

/**
 * Calcula transformações temporárias dos efeitos.
 * Mantém estado de suavização e transição entre frames.
 */
export class EffectSystem {
  private random = new Map<string, RandomState>();
  private trans  = new Map<string, number>();   // progresso de transição 0..1

  reset(): void {
    this.random.clear();
    this.trans.clear();
  }

  compute(
    effects: AvatarEffect[],
    state: AvatarState,
    audioLevel: number,      // 0..1
    movementScale: number,   // 0..3
    timeMs: number,
    deltaMs: number,
  ): EffectTransform {
    const out = identityTransform();
    if (!effects || effects.length === 0) return out;

    const t  = timeMs / 1000;
    const dt = Math.max(0, Math.min(0.1, deltaMs / 1000));

    for (const fx of effects) {
      if (!fx.enabled) continue;

      const active = this.isActive(fx.trigger, state);
      const prog   = this.updateTransition(fx, active ? 1 : 0, dt);
      if (prog <= 0.001) continue;

      const eased = this.curve(fx.transition, prog);
      // movementScale 0 zera os efeitos de movimento
      const moveScale = movementScale * eased;
      // volume modula levemente a intensidade (mín. 0.6 pra não sumir)
      const volMod = 0.6 + 0.4 * Math.min(1, audioLevel * 1.5);

      switch (fx.type) {
        case "darken": {
          const intensity = fx.params.intensity ?? 0.4;
          const speed     = fx.params.speed ?? 6;
          const pulse     = 0.5 + 0.5 * Math.sin(t * speed);
          out.brightness -= intensity * eased * pulse;
          break;
        }
        case "jump": {
          const amount = fx.params.amount ?? 12;
          const speed  = fx.params.speed ?? 8;
          const offset = Math.abs(Math.sin(t * speed)) * amount;
          out.y -= offset * moveScale * volMod;
          break;
        }
        case "randomMove": {
          const amount    = fx.params.amount ?? 10;
          const speed     = fx.params.speed ?? 12;
          const smoothing = fx.params.smoothing ?? 0.4;
          const rs        = this.getRandom(fx.id);
          rs.next -= dt * speed;
          if (rs.next <= 0) {
            rs.tx   = (Math.random() * 2 - 1) * amount;
            rs.ty   = (Math.random() * 2 - 1) * amount;
            rs.next = 1;
          }
          const lerp = 1 - Math.pow(smoothing, dt * 60);
          rs.cx += (rs.tx - rs.cx) * lerp;
          rs.cy += (rs.ty - rs.cy) * lerp;
          out.x += rs.cx * moveScale * volMod;
          out.y += rs.cy * moveScale * volMod;
          break;
        }
        case "waveMove": {
          const amount = fx.params.amount ?? 10;
          const speed  = fx.params.speed ?? 3;
          const axis   = fx.params.axis ?? "y";
          if (axis === "x" || axis === "both") out.x += Math.sin(t * speed) * amount * moveScale;
          if (axis === "y" || axis === "both") out.y += Math.cos(t * speed) * amount * moveScale;
          break;
        }
        case "waveRotate": {
          const amount = fx.params.amount ?? 8;   // graus
          const speed  = fx.params.speed ?? 3;
          const deg    = Math.sin(t * speed) * amount;
          out.rotation += (deg * Math.PI / 180) * moveScale;
          break;
        }
      }
    }

    out.brightness = Math.max(0, Math.min(2, out.brightness));
    out.alpha      = Math.max(0, Math.min(1, out.alpha));
    return out;
  }

  private isActive(trigger: Trigger, state: AvatarState): boolean {
    switch (trigger) {
      case "always":  return true;
      case "talking": return state === "talking" || state === "blink-talking";
      case "idle":    return state === "idle"    || state === "blink-idle";
      case "blink":   return state === "blink-idle" || state === "blink-talking";
      default:        return false;  // happy/angry/sad/surprised ainda não mapeados
    }
  }

  private getRandom(id: string): RandomState {
    let rs = this.random.get(id);
    if (!rs) { rs = { tx: 0, ty: 0, cx: 0, cy: 0, next: 0 }; this.random.set(id, rs); }
    return rs;
  }

  private updateTransition(fx: AvatarEffect, target: number, dt: number): number {
    let p = this.trans.get(fx.id) ?? 0;
    if (fx.transition === "none") {
      p = target;
    } else {
      p += (target - p) * Math.min(1, dt * 4);
    }
    this.trans.set(fx.id, p);
    return p;
  }

  private curve(transition: Transition, p: number): number {
    if (transition === "bounce") return p < 1 ? p * (1 + 0.15 * Math.sin(p * Math.PI)) : 1;
    if (transition === "smooth") return p * p * (3 - 2 * p);  // smoothstep
    return p;
  }
}