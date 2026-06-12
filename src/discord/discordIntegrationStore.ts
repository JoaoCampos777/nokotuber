import { writable, derived, get } from "svelte/store";
import type {
  DiscordConnectionState, DiscordVoiceChannelSnapshot,
  DiscordSpeakingEvent, DiscordBotCompanionConfig,
} from "./discordTypes";
import { defaultDiscordConnectionState, defaultBotCompanionConfig } from "./discordTypes";
import { discordError } from "./discordErrors";
import { tauriRpcClient } from "./discordRpcProvider";
import { makeFakeChannel } from "./discordVoiceMapper";
import { emitDiscordSpeakingEvent } from "../audio/discordSpeakingProvider";
import { bindDiscordUser, unbindDiscordUser } from "../audio/audioBindingStore";

export const discordConnection   = writable<DiscordConnectionState>(defaultDiscordConnectionState());
export const discordVoiceChannel = writable<DiscordVoiceChannelSnapshot | null>(null);
export const discordBot          = writable<DiscordBotCompanionConfig>(defaultBotCompanionConfig());

export const discordUsers = derived(discordVoiceChannel, ($c) => $c?.users ?? []);
/** Alias de compatibilidade (usado por DiscordBindControls). */
export const discordVoiceUsers = discordUsers;

// ─── Conexão (RPC via Tauri; hoje stub honesto) ───
export async function connectDiscordRpc(applicationId: string): Promise<void> {
  const appId = (applicationId || "").trim();
  if (!appId) {
    discordConnection.update((s) => ({ ...s, enabled: true, status: "not_configured", error: discordError("needsApproval") }));
    return;
  }
  discordConnection.update((s) => ({ ...s, enabled: true, applicationId: appId, status: "connecting", connected: false, authenticated: false, error: undefined }));
  try {
    await tauriRpcClient.connect(appId);   // handshake REAL com o Discord local
    discordConnection.update((s) => ({ ...s, status: "connected", connected: true, authenticated: false, error: undefined }));
    // Voz (R2/R3): hoje exige app aprovado p/ RPC + token seguro → honesto, não-fatal.
    try {
      await tauriRpcClient.authenticate();
      discordConnection.update((s) => ({ ...s, status: "authenticated", authenticated: true, error: undefined }));
      await refreshSelectedDiscordVoiceChannel();
    } catch (authErr: any) {
      discordConnection.update((s) => ({ ...s, error: authErr?.message ?? discordError("needsApproval") }));
    }
  } catch (e: any) {
    discordConnection.update((s) => ({ ...s, status: "unavailable", connected: false, authenticated: false, error: e?.message ?? discordError("connectFailed") }));
  }
}

export async function disconnectDiscordRpc(): Promise<void> {
  try { await tauriRpcClient.disconnect(); } catch {}
  discordConnection.set(defaultDiscordConnectionState());
  discordVoiceChannel.set(null);
}

export async function refreshSelectedDiscordVoiceChannel(): Promise<void> {
  try {
    const snap = await tauriRpcClient.getSelectedVoiceChannel();
    if (!snap) { discordConnection.update((s) => ({ ...s, error: discordError("noChannel") })); return; }
    discordConnection.update((s) => ({ ...s,
      currentGuildId: snap.guildId, currentGuildName: snap.guildName,
      currentChannelId: snap.channelId, currentChannelName: snap.channelName, error: undefined }));
    discordVoiceChannel.set(snap);
    if (snap.channelId) { try { await tauriRpcClient.subscribeSpeakingEvents(snap.channelId); } catch {} }
  } catch {
    discordConnection.update((s) => ({ ...s, error: discordError("noUsers") }));
  }
}

// ─── Vínculos (persistem em audioRouting.bindings) ───
export function bindDiscordUserToParticipant(participantId: string, userId: string, userName: string): void {
  bindDiscordUser(participantId, userId, userName);
}
export function unbindDiscordUserFromParticipant(participantId: string): void {
  unbindDiscordUser(participantId);
}

// ─── Eventos de fala → routeSpeakingEvent (via discordSpeakingProvider) ───
export function handleDiscordSpeakingEvent(event: DiscordSpeakingEvent): void {
  emitDiscordSpeakingEvent(event);
}

// ─── Teste com usuários fake ───
export function loadFakeUsers(): void {
  discordVoiceChannel.set(makeFakeChannel());
  discordConnection.update((s) => ({ ...s, currentGuildName: "Servidor de Teste", currentChannelName: "Sala de Voz (Teste)" }));
}

// ─── R2: autenticação via socket RPC (AUTHORIZE → trocar code → AUTHENTICATE) ───
function errText(e: any): string { return typeof e === "string" ? e : (e?.message ?? String(e)); }

export async function authenticateDiscordPoC(scopes: string[] = ["rpc", "rpc.voice.read"], redirectUri = ""): Promise<void> {
  const appId = (get(discordConnection).applicationId ?? "").trim();
  if (!appId) { discordConnection.update((s) => ({ ...s, error: "Informe o Application ID." })); return; }
  if (!get(discordConnection).connected) { discordConnection.update((s) => ({ ...s, error: "Conecte ao Discord (R1) primeiro." })); return; }

  discordConnection.update((s) => ({ ...s, status: "connecting", error: undefined }));

  // ETAPA A — AUTHORIZE pelo socket RPC (o Discord mostra o modal de autorização)
  let code: string;
  try {
    code = await tauriRpcClient.rpcAuthorize(appId, scopes);
  } catch (e) {
    discordConnection.update((s) => ({ ...s, status: "connected", error: `AUTHORIZE (RPC) falhou → ${errText(e)}` }));
    return;
  }

  // ETAPA B — trocar o code por access_token (dev: secret via variável de ambiente)
  let token: string;
  try {
    token = await tauriRpcClient.exchangeSecret(appId, code, redirectUri);
  } catch (e) {
    discordConnection.update((s) => ({ ...s, status: "connected", error: `Troca de token falhou → ${errText(e)}` }));
    return;
  }

  // ETAPA C — AUTHENTICATE pelo socket RPC
  try {
    await tauriRpcClient.authenticateWithToken(token);
    discordConnection.update((s) => ({ ...s, status: "authenticated", authenticated: true, error: undefined }));
  } catch (e) {
    discordConnection.update((s) => ({ ...s, status: "connected", error: `AUTHENTICATE (RPC) falhou → ${errText(e)}` }));
  }
}


// ─── Aliases de compatibilidade (painel antigo da E4, se existir) ───
export const connectDiscord = () => connectDiscordRpc(get(discordConnection).applicationId ?? "");
export const disconnectDiscord = disconnectDiscordRpc;
export const refreshDiscordVoiceState = refreshSelectedDiscordVoiceChannel;
