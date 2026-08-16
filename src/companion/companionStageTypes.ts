import type { RoomParticipant, RoomAvatar } from "../room/roomTypes";
import type { ParticipantEffects } from "../effects/participantEffects";

/**
 * No snapshot, as imagens dos avatares NÃO vão inline (base64 pesado). Cada
 * imagem `data:` vira uma referência `asset:<hash>`; o Companion resolve pelo
 * cache e pede as que faltam via `request_assets`. URLs internas (ex.: /assets/…)
 * ficam inline (são leves e resolvem no próprio build do Companion).
 */
export const ASSET_PREFIX = "asset:";

/** Envio de um asset pesado (imagem base64) sob demanda, separado do snapshot. */
export interface RoomAssetMessage {
  type: "room_asset";
  assetId: string;
  dataUrl: string;
  byteLength: number;
}

/** Fundo da cena (mesmos campos de project.view usados pelo RoomRenderer2D). */
export interface RoomSnapshotScene {
  backgroundMode: "transparent" | "color" | "chroma" | string;
  backgroundColor: string;
}

/** Snapshot da cena do Host enviado aos Companions (via WebSocket). */
export interface RoomSnapshotMessage {
  type: "room_snapshot";
  roomCode: string;
  sentAt: number;
  canvas: { width: number; height: number };
  /** Fundo da sala (cor/chroma/transparente). */
  scene: RoomSnapshotScene;
  /** Participantes visíveis, já ordenados por zIndex (formato nativo do renderer). */
  participants: RoomParticipant[];
  /**
   * Avatares referenciados; images (base) e images de cada expressão contêm refs
   * `asset:<hash>` (ou URL inline leve). Inclui expressões nomeadas + qual está
   * ativa/de grito, para a Janela renderizar igual ao Host.
   */
  avatars: Record<string, Pick<RoomAvatar, "id" | "name" | "images" | "expressions" | "activeExpressionId" | "shoutExpressionId" | "addons" | "mouth">>;
  /** Efeitos por participante (mesmo formato do store participantEffects do Host). */
  effects: Record<string, ParticipantEffects>;
  /** Ids de asset referenciados por este snapshot (para o Companion pedir os ausentes). */
  requiredAssets?: string[];
}

/** Evento leve de fala, para a janela reagir sem reenviar o snapshot inteiro. */
export interface ParticipantSpeakingMessage {
  type: "participant_speaking";
  participantId: string;
  isSpeaking: boolean;
  timestamp: number;
}
