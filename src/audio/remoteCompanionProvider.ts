import { routeSpeakingEvent } from "./participantAudioRouter";

/** Converte fala vinda de um Companion remoto no SpeakingEvent padrão do app. */
export function emitRemoteCompanionSpeakingEvent(params: {
  remoteUserId: string;
  displayName: string;
  isSpeaking: boolean;
  volume?: number;
}): void {
  routeSpeakingEvent({
    sourceId: `companion:${params.remoteUserId}`,
    providerType: "remote_companion",
    externalUserId: params.remoteUserId,
    externalUserName: params.displayName,
    isSpeaking: params.isSpeaking,
    volume: params.volume,
    timestamp: Date.now(),
  });
}