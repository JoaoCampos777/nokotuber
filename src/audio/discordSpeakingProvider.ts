import { routeSpeakingEvent } from "./participantAudioRouter";
import type { DiscordSpeakingEvent } from "../discord/discordTypes";

/**
 * Converte evento de fala do Discord para o evento padrão do Nokotuber.
 * Não chama renderer diretamente.
 */
export function emitDiscordSpeakingEvent(event: DiscordSpeakingEvent): void {
  routeSpeakingEvent({
    sourceId: `discord:${event.discordUserId}`,
    providerType: "discord_rpc_experimental",
    externalUserId: event.discordUserId,
    externalUserName: event.discordUserName,
    isSpeaking: event.isSpeaking,
    timestamp: event.timestamp || Date.now(),
  });
}