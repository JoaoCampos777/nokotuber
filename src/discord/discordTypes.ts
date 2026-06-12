export type DiscordIntegrationStatus =
  | "disabled" | "not_configured" | "connecting"
  | "connected" | "authenticated" | "unavailable" | "error";

export interface DiscordConnectionState {
  enabled: boolean;
  status: DiscordIntegrationStatus;
  applicationId?: string;
  connected: boolean;
  authenticated: boolean;
  currentGuildId?: string;
  currentGuildName?: string;
  currentChannelId?: string;
  currentChannelName?: string;
  error?: string;
}

export interface DiscordVoiceUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isSpeaking: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSelfMuted?: boolean;
  isSelfDeafened?: boolean;
}

export interface DiscordVoiceChannelSnapshot {
  guildId?: string;
  guildName?: string;
  channelId: string;
  channelName?: string;
  users: DiscordVoiceUser[];
}

export interface DiscordSpeakingEvent {
  discordUserId: string;
  discordUserName?: string;
  isSpeaking: boolean;
  timestamp: number;
}

export interface DiscordBotCompanionConfig {
  enabled: boolean;
  guildId?: string;
  channelId?: string;
  bridgeUrl?: string;
  pairingCode?: string;
  status: "disabled" | "pairing" | "connected" | "error";
}

export function defaultDiscordConnectionState(): DiscordConnectionState {
  return { enabled: false, status: "disabled", connected: false, authenticated: false };
}

export function defaultBotCompanionConfig(): DiscordBotCompanionConfig {
  return { enabled: false, status: "disabled" };
}

// Mensagens amigáveis vivem em discordErrors; re-exporto para compatibilidade.
export { DISCORD_MESSAGES } from "./discordErrors";