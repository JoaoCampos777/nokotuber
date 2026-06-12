export const DISCORD_MESSAGES = {
  connectFailed: "Não foi possível conectar ao Discord local. Verifique se o Discord está aberto.",
  experimental:  "A integração Discord ainda está em modo experimental.",
  needsApproval: "Esta função pode exigir uma aplicação Discord aprovada para RPC.",
  noChannel:     "Nenhum canal de voz selecionado foi encontrado.",
  noUsers:       "Não foi possível listar usuários da call.",
  useManual:     "Use o modo manual ou microfone compartilhado enquanto a integração Discord não estiver disponível.",
} as const;

export type DiscordErrorKey = keyof typeof DISCORD_MESSAGES;
export function discordError(key: DiscordErrorKey): string { return DISCORD_MESSAGES[key]; }