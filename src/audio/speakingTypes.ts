export type SpeakingProviderType =
  | "shared_microphone"
  | "manual_test"
  | "discord_rpc_experimental"
  | "discord_bot_companion"
  | "virtual_audio_device"
  | "remote_companion";

export interface SpeakingProviderInfo {
  id: string;
  type: SpeakingProviderType;
  name: string;
  enabled: boolean;
  available: boolean;
  requiresSetup: boolean;
  description: string;
}

export interface SpeakingEvent {
  sourceId: string;
  participantId?: string;
  externalUserId?: string;
  externalUserName?: string;
  isSpeaking: boolean;
  volume?: number;
  timestamp: number;
  providerType: SpeakingProviderType;
}

export type AudioBindingMode =
  | "shared_microphone"
  | "manual_test"
  | "discord_user"
  | "virtual_audio_channel"
  | "remote_companion_user";

export interface ParticipantAudioBinding {
  participantId: string;
  providerId: string;
  sourceId: string;
  mode: AudioBindingMode;
  externalUserId?: string;
  externalUserName?: string;
  enabled: boolean;
}

export type MicRoomMode = "all" | "selected" | "off";

export interface AudioRouting {
  version: string;
  defaultProviderId: string;
  micMode: MicRoomMode;
  micTargetParticipantId?: string | null;
  providers: SpeakingProviderInfo[];
  bindings: ParticipantAudioBinding[];
}

export const AUDIO_ROUTING_VERSION = "1.0.0";