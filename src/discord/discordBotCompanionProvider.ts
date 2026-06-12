import type { DiscordBotCompanionConfig } from "./discordTypes";

/**
 * Stub do modo futuro com bot OFICIAL + ponte local.
 * Nenhum servidor cloud / bot é iniciado agora — apenas a arquitetura está pronta.
 */
export async function botPair(_config: Partial<DiscordBotCompanionConfig>): Promise<{ ok: boolean; error?: string }> {
  return {
    ok: false,
    error: "Bot Companion ainda não disponível. Será habilitado numa versão futura, via bot oficial e ponte local.",
  };
}

export function botProviderInfo(): string {
  return "Futuro: adicione o bot oficial do Nokotuber ao servidor; o app recebe eventos de voz por uma ponte local.";
}