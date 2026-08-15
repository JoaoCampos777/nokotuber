import type { AvatarImages, BlinkConfig, AudioConfig } from "../project/projectTypes";
import type { ViewSettings } from "../view/viewTypes";
import type { AvatarEffect } from "../effects/effectTypes";
import type { ExpressionProjectState } from "../project/expressionTypes";
import type { VoiceReactionRule } from "../audio/voiceReactionTypes";

/**
 * Um "personagem" reutilizável — o pacote completo que define um avatar,
 * INDEPENDENTE do projeto/cena em que é usado. Reaproveita exatamente as
 * estruturas que já existem no Solo (imagens, piscada, áudio, view, efeitos,
 * expressões, reação de voz), para que salvar/aplicar seja só extrair/injetar
 * — sem duplicar lógica nem quebrar o formato .noko.
 *
 * Campos opcionais (addons/mouth) ficam RESERVADOS para as próximas fases
 * (Add-ons, Visemas). Guardá-los como opcionais mantém o formato .nokochar
 * compatível para frente, sem precisar migração quando essas fases chegarem.
 */
export interface CharacterMeta {
  /** De onde veio: embutido no app, criado localmente, ou loja (futuro). */
  source?: "built-in" | "local" | "marketplace";
  productId?: string;
  author?: string;
  /** Versão do app que salvou (diagnóstico). */
  appVersion?: string;
}

export interface Character {
  id: string;
  name: string;
  /** Versão do schema do personagem (migração futura). */
  characterVersion: number;
  createdAt: string;
  updatedAt: string;

  // ─── Núcleo do avatar (espelha o Solo) ───
  images: AvatarImages;
  blinkConfig: BlinkConfig;
  audioConfig: AudioConfig;
  /** Limiar de fala "vivo" (o que o runtime usa; audioStore.audioThreshold). */
  speechThreshold: number;
  view: ViewSettings;
  effects: AvatarEffect[];
  useDefaultAvatar: boolean;
  expressions: ExpressionProjectState;
  voiceReaction: VoiceReactionRule;

  // ─── Reservado para fases futuras (opcional → compat p/ frente) ───
  addons?: unknown[];   // Fase 3 (Add-ons)
  mouth?: unknown;      // Fase 5 (Visemas / boca separada)

  meta?: CharacterMeta;
}

export const CHARACTER_SCHEMA_VERSION = 1;

/** Extensão do arquivo de personagem exportável. */
export const CHARACTER_FILE_EXT = "nokochar";

export function isCharacter(v: any): v is Character {
  return !!v && typeof v === "object"
    && typeof v.id === "string"
    && typeof v.name === "string"
    && !!v.images && typeof v.images === "object";
}
