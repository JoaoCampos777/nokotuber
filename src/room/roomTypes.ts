import type { ExpressionImages } from "../project/expressionTypes";

/** Como o áudio de um participante é alimentado. */
export type AudioBindingMode =
  | "shared_microphone"        // todos no mesmo mic (implementado)
  | "manual_test"              // disparo manual de fala (implementado)
  | "individual_input"         // preparado, ainda não implementado
  | "future_discord_capture";  // stub para foco futuro em Discord

/** Avatar da sala — reaproveita o conceito de 4 imagens; preparado para evoluir. */
export interface RoomAvatar {
  id: string;
  name: string;
  images: ExpressionImages;   // mouthClosed / mouthOpen / blinkClosed / blinkOpen
  // futuro: expressions, layers, states, blink, animationPresets
}

export interface ParticipantPosition { x: number; y: number; }

export interface RoomParticipant {
  id: string;
  name: string;
  enabled: boolean;
  avatarId: string;
  audioSourceId: string;       // "default" por enquanto
  audioMode: AudioBindingMode;
  position: ParticipantPosition;
  scale: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  mirrorX: boolean;
  // runtime (não precisa persistir, mas mantemos por simplicidade)
  isSpeaking: boolean;
  expressionStateId: string;   // idle/talking… (uso futuro)
}

export interface RoomSettings {
  enabled: boolean;
  version: string;
  maxParticipants: number;     // 2 agora; até ROOM_MAX_FUTURE depois
  layoutMode: "manual" | "preset";
  participants: RoomParticipant[];
  avatars: RoomAvatar[];
}

/** Canvas lógico da cena (mesma proporção 16:9 do OBS). */
export const ROOM_CANVAS = { width: 1920, height: 1080 };
export const ROOM_VERSION = "1.0.0";
export const ROOM_MAX_FUTURE = 10;