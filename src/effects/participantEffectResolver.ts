import type { ParticipantEffects, ActiveRoomReaction } from "./participantEffects";

export interface EffectTransform {
  dx: number;          // px lógicos (espaço 1920x1080)
  dy: number;          // px lógicos
  scaleMul: number;    // multiplica a escala base
  rotationAdd: number; // graus, somados à rotação base
  highlight: number;   // 0..1 (brilho/glow ao falar)
}

function identity(): EffectTransform {
  return { dx: 0, dy: 0, scaleMul: 1, rotationAdd: 0, highlight: 0 };
}

/** Fase estável por participante, pra que os efeitos não fiquem em sincronia. */
export function participantSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return ((h % 1000) / 1000) * Math.PI * 2;
}

const TAU = Math.PI * 2;

/**
 * Resolve os efeitos de UM participante em deltas de transform.
 * Função pura: depende só dos efeitos daquele participante + tempo + seed,
 * então nunca afeta outro participante.
 */
export function resolveParticipantEffects(
  fx: ParticipantEffects | undefined,
  isSpeaking: boolean,
  nowMs: number,
  seed: number,
): EffectTransform {
  const out = identity();
  if (!fx || !fx.enabled) return out;

  const t = nowMs / 1000;
  const p = fx.presets;

  // Respiração — só quando NÃO está falando
  if (p.idleBreathing?.enabled && !isSpeaking) {
    const amp = p.idleBreathing.intensity * 0.004;          // ~1% por ponto
    const w = TAU * 0.25 * (p.idleBreathing.speed || 1);
    out.scaleMul *= 1 + amp * Math.sin(w * t + seed);
  }

  // Balanço de cabeça — contínuo e sutil
  if (p.headBob?.enabled) {
    const amp = p.headBob.intensity * 1.4;                   // px
    const w = TAU * 0.4 * (p.headBob.speed || 1);
    out.dy += amp * Math.sin(w * t + seed);
    out.rotationAdd += p.headBob.intensity * 0.15 * Math.sin(w * 0.5 * t + seed);
  }

  if (isSpeaking) {
    // Pulo ao falar (para cima → dy negativo)
    if (p.talkBounce?.enabled) {
      const amp = p.talkBounce.intensity * 3.0;              // px
      const w = TAU * 3.0 * (p.talkBounce.speed || 1);
      out.dy -= Math.abs(Math.sin(w * t + seed)) * amp;
    }
    // Tremor ao falar
    if (p.talkShake?.enabled) {
      const amp = p.talkShake.intensity * 2.0;               // px
      const w = TAU * 12 * (p.talkShake.speed || 1);
      out.dx += Math.sin(w * t + seed * 1.7) * amp;
      out.dy += Math.cos(w * 1.3 * t + seed) * amp * 0.6;
    }
    // Destaque ao falar (gancho futuro: glow)
    if (p.highlightWhenSpeaking?.enabled) {
      out.highlight = Math.min(1, p.highlightWhenSpeaking.intensity / 10);
    }
  }

  return out;
}

/**
 * Resolve uma REAÇÃO de voz ativa (efeito transitório disparado ao falar/simular)
 * em deltas de transform. Envelope sobe e desce ao longo de durationMs.
 * Determinístico por (reação + tempo + seed); por participante.
 * Obs.: "expressionSwap" não tem efeito visual na sala (avatares só têm imagens base).
 */
export function resolveReactionTransform(
  reaction: ActiveRoomReaction | undefined,
  nowMs: number,
  seed: number,
): EffectTransform {
  const out = identity();
  if (!reaction || !reaction.effects?.length) return out;
  const elapsed = nowMs - reaction.startedAt;
  if (elapsed < 0 || elapsed > reaction.durationMs) return out;

  const env = Math.sin(Math.PI * (elapsed / reaction.durationMs)); // 0 → 1 → 0
  const I = Math.max(0, Math.min(1, reaction.intensity / 100));
  const t = nowMs / 1000;
  const fx = reaction.effects;

  if (fx.includes("shake")) {
    out.dx += Math.sin(t * TAU * 11 + seed) * 9 * I * env;
    out.dy += Math.cos(t * TAU * 13 + seed) * 6 * I * env;
  }
  if (fx.includes("strongShake")) {
    out.dx += Math.sin(t * TAU * 17 + seed * 1.7) * 24 * I * env;
    out.dy += Math.cos(t * TAU * 19 + seed) * 16 * I * env;
    out.rotationAdd += Math.sin(t * TAU * 9 + seed) * 4 * I * env;
  }
  if (fx.includes("randomMovement")) {
    out.dx += Math.sin(t * TAU * 6.3 + seed * 1.3) * 20 * I * env;
    out.dy += Math.cos(t * TAU * 4.7 + seed * 0.7) * 20 * I * env;
  }
  if (fx.includes("scalePulse")) {
    out.scaleMul *= 1 + 0.3 * I * env;
  }
  if (fx.includes("colorFlash")) {
    out.highlight = Math.max(out.highlight, I * env);
  }
  return out;
}