import type { DiscordVoiceUser, DiscordVoiceChannelSnapshot } from "./discordTypes";

/** Usuários fake para validar a arquitetura sem Discord real. */
export const FAKE_DISCORD_USERS: DiscordVoiceUser[] = [
  { id: "discord_fake_joao", username: "joao", displayName: "João Fake", isSpeaking: false },
  { id: "discord_fake_mark", username: "mark", displayName: "Mark Fake", isSpeaking: false },
];

export function makeFakeChannel(): DiscordVoiceChannelSnapshot {
  return {
    guildId: "fake_guild",
    guildName: "Servidor de Teste",
    channelId: "fake_channel",
    channelName: "Sala de Voz (Teste)",
    users: FAKE_DISCORD_USERS.map((u) => ({ ...u })),
  };
}

/** Converte um snapshot bruto (futuro RPC) no formato do app, de forma defensiva. */
export function mapRpcSnapshot(raw: any): DiscordVoiceChannelSnapshot | null {
  if (!raw || typeof raw !== "object" || !raw.channelId) return null;
  const users: DiscordVoiceUser[] = Array.isArray(raw.users)
    ? raw.users.map((u: any) => ({
        id: String(u.id ?? ""),
        username: String(u.username ?? u.displayName ?? "user"),
        displayName: String(u.displayName ?? u.nick ?? u.username ?? "user"),
        avatarUrl: u.avatarUrl ?? undefined,
        isSpeaking: !!u.isSpeaking,
        isMuted: u.isMuted ?? undefined,
        isDeafened: u.isDeafened ?? undefined,
        isSelfMuted: u.isSelfMuted ?? undefined,
        isSelfDeafened: u.isSelfDeafened ?? undefined,
      })).filter((u: DiscordVoiceUser) => u.id)
    : [];
  return {
    guildId: raw.guildId ?? undefined,
    guildName: raw.guildName ?? undefined,
    channelId: String(raw.channelId),
    channelName: raw.channelName ?? undefined,
    users,
  };
}