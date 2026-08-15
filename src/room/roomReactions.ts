import { writable } from "svelte/store";
import type { ActiveRoomReaction } from "../effects/participantEffects";
import type { VoiceReactionEffectType } from "../audio/voiceReactionTypes";

/**
 * Reações de voz ativas no momento, por participante. Alimentado:
 *  - no Host, quando uma reação dispara (fala/simular);
 *  - no Companion (página da janela), ao receber `participant_reaction`.
 * O renderer (RoomRenderer2D) lê este estado e aplica o efeito transitório.
 * Cada processo usa seu próprio relógio (performance.now()) — sem sync de clock.
 */
export const activeRoomReactions = writable<Record<string, ActiveRoomReaction>>({});

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Inicia (ou reinicia) uma reação para um participante. */
export function applyReaction(
  participantId: string,
  effects: VoiceReactionEffectType[],
  intensity: number,
  durationMs: number,
  expressionId: string | null = null,
): void {
  // Uma reação pode ser só troca de expressão (grito) sem efeitos de transform,
  // então aceita effects vazio desde que haja uma expressão.
  if (!participantId || durationMs <= 0) return;
  if ((!Array.isArray(effects) || effects.length === 0) && !expressionId) return;
  const reaction: ActiveRoomReaction = {
    participantId,
    effects: Array.isArray(effects) ? [...effects] : [],
    intensity,
    startedAt: performance.now(),
    durationMs,
    expressionId,
  };
  activeRoomReactions.update((m) => ({ ...m, [participantId]: reaction }));
  const prev = timers.get(participantId);
  if (prev) clearTimeout(prev);
  timers.set(participantId, setTimeout(() => {
    timers.delete(participantId);
    activeRoomReactions.update((m) => { const n = { ...m }; delete n[participantId]; return n; });
  }, durationMs + 60));
}

export function clearReactions(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  activeRoomReactions.set({});
}
