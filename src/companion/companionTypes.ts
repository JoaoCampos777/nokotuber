export type CompanionConnectionStatus =
  | "disabled" | "starting" | "hosting" | "connecting" | "connected" | "disconnected" | "error";

export interface RemoteCompanionParticipant {
  id: string;
  displayName: string;
  connected: boolean;
  isSpeaking: boolean;
  volume: number;
  lastSeenAt: number;
  boundParticipantId?: string;
}

export interface CompanionRoomState {
  serverRunning?: boolean;
  enabled: boolean;
  roomId: string | null;
  hostPort: number;
  hostUrl: string | null;
  status: CompanionConnectionStatus;
  error?: string;
  participants: RemoteCompanionParticipant[];
  relayUrl: string;
  vpnIp?: string;
  localIp?: string;
}

export interface CompanionClientState {
  enabled: boolean;
  clientId: string;
  displayName: string;
  hostUrl: string;
  status: CompanionConnectionStatus;
  error?: string;
  selectedInputDeviceId: string;
  volume: number;
  isSpeaking: boolean;
}

export type CompanionMessageType =
  | "hello" | "welcome" | "participant_joined" | "participant_left"
  | "speaking" | "volume" | "heartbeat" | "error";

export const COMPANION_PROTOCOL_VERSION = "1.0.0";
export const DEFAULT_COMPANION_PORT = 8787;

export function defaultCompanionRoom(): CompanionRoomState {
  return { vpnIp: "", relayUrl: "", serverRunning: false, enabled: false, roomId: null, hostPort: DEFAULT_COMPANION_PORT, hostUrl: null, status: "disabled", participants: [] };
}