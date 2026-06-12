import { routeSpeakingEvent } from "./participantAudioRouter";

/** Aciona a fala manual de um participante específico (segurar ou toggle). */
export function setManualSpeaking(participantId: string, isSpeaking: boolean): void {
  routeSpeakingEvent({
    sourceId: `manual_${participantId}`,
    participantId,
    isSpeaking,
    timestamp: Date.now(),
    providerType: "manual_test",
  });
}