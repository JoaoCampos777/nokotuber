import { COMPANION_PROTOCOL_VERSION } from "./companionTypes";

export function helloMsg(clientId: string, displayName: string, roomCode: string): string {
  return JSON.stringify({ type: "hello", clientId, displayName, roomCode, protocolVersion: COMPANION_PROTOCOL_VERSION });
}
export function speakingMsg(isSpeaking: boolean, volume: number): string {
  return JSON.stringify({ type: "speaking", isSpeaking, volume, timestamp: Date.now() });
}
export function heartbeatMsg(): string { return JSON.stringify({ type: "heartbeat", timestamp: Date.now() }); }