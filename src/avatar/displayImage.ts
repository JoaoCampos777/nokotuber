import { derived } from "svelte/store";
import { currentImageUrl, avatarState, type AvatarState } from "./avatarController";
import { activeExpression, expressionState } from "../project/expressionStore";
import { isReacting, activeVoiceReactions, voiceReactionRule } from "../audio/audioStore";
import type { ExpressionImages, Expression } from "../project/expressionTypes";

/**
 * Expressão efetiva exibida no avatar.
 * Durante uma reação de voz do tipo "expressionSwap", troca para a expressão
 * temporária configurada; caso contrário, usa a expressão ativa normal.
 */
export const effectiveExpression = derived(
  [activeExpression, isReacting, activeVoiceReactions, voiceReactionRule, expressionState],
  ([$base, $reacting, $vr, $rule, $exState]): Expression | null => {
    if ($reacting && $vr.includes("expressionSwap") && $rule.temporaryExpressionId) {
      const set = $exState.sets.find((s) => s.id === $exState.activeSetId);
      const tmp = set?.expressions.find((e) => e.id === $rule.temporaryExpressionId);
      if (tmp) return tmp;
    }
    return $base;
  },
);

/** Escolhe a imagem da expressão para o estado atual, com fallback entre slots. */
function expImageForState(images: ExpressionImages | undefined | null, state: AvatarState): string | null {
  if (!images) return null;
  switch (state) {
    case "talking":       return images.mouthOpen   ?? images.mouthClosed ?? null;
    case "blink-idle":    return images.blinkClosed ?? images.mouthClosed ?? null;
    case "blink-talking": return images.blinkOpen   ?? images.mouthOpen ?? images.mouthClosed ?? null;
    case "idle":
    default:              return images.mouthClosed ?? null;
  }
}

/**
 * Imagem final exibida no avatar:
 * 1) imagem da expressão EFETIVA (já considera a troca por reação) para o estado atual
 * 2) senão, o avatar global/padrão (currentImageUrl)
 */
export const displayImageUrl = derived(
  [effectiveExpression, avatarState, currentImageUrl],
  ([$exp, $state, $fallback]) => expImageForState($exp?.images, $state) ?? $fallback,
);