import { invoke } from "@tauri-apps/api/core";
import { isTauriEnv } from "../core/desktop";
import { discordError } from "./discordErrors";
import { mapRpcSnapshot } from "./discordVoiceMapper";
import type { DiscordVoiceChannelSnapshot } from "./discordTypes";

/** Interface preparada para o RPC real (D5). O stub abaixo implementa via Tauri. */
export interface DiscordRpcClient {
  connect(applicationId: string): Promise<void>;
  authenticate(): Promise<void>;
  getSelectedVoiceChannel(): Promise<DiscordVoiceChannelSnapshot | null>;
  subscribeSpeakingEvents(channelId: string): Promise<void>;
  disconnect(): Promise<void>;
  // R2 (PoC de autenticação)
  authorizePkce(applicationId: string, scopes: string[], codeChallenge: string, redirectUri: string): Promise<string>;
  oauthPkceAuthorize(applicationId: string, scopes: string[], codeChallenge: string, port: number): Promise<any>;
  rpcAuthorize(applicationId: string, scopes: string[]): Promise<string>;
  exchangeSecret(applicationId: string, code: string, redirectUri: string): Promise<string>;
  exchangePkce(applicationId: string, code: string, codeVerifier: string, redirectUri: string): Promise<string>;
  authenticateWithToken(accessToken: string): Promise<string>;
}

/**
 * Cliente RPC via Tauri. Hoje os comandos Rust são stubs (ou ausentes) → qualquer
 * falha vira erro amigável. NENHUM token pessoal/selfbot/API não-oficial é usado.
 */
export const tauriRpcClient: DiscordRpcClient = {
  async connect(applicationId: string): Promise<void> {
    if (!isTauriEnv()) throw new Error(discordError("connectFailed"));
    try { await invoke("discord_rpc_connect", { applicationId }); }
    catch (e: any) { throw new Error(typeof e === "string" ? e : (e?.message ?? discordError("connectFailed"))); }
  },
  async authenticate(): Promise<void> {
    try { await invoke("discord_rpc_authenticate"); }
    catch (e: any) { throw new Error(typeof e === "string" ? e : (e?.message ?? discordError("needsApproval"))); }
  },
  async getSelectedVoiceChannel(): Promise<DiscordVoiceChannelSnapshot | null> {
    try { return mapRpcSnapshot(await invoke("discord_rpc_get_selected_voice_channel")); }
    catch { return null; }
  },
  async subscribeSpeakingEvents(channelId: string): Promise<void> {
    try { await invoke("discord_rpc_subscribe_voice_events", { channelId }); } catch { /* stub */ }
  },
  async disconnect(): Promise<void> {
    try { await invoke("discord_rpc_disconnect"); } catch { /* stub */ }
  },
  // ─── R2 (PoC): deixam o erro do Rust propagar pra UI mostrar a etapa exata ───
  async authorizePkce(applicationId, scopes, codeChallenge, redirectUri): Promise<string> {
    return await invoke<string>("discord_rpc_authorize", { applicationId, scopes, codeChallenge, redirectUri });
  },
  async oauthPkceAuthorize(applicationId, scopes, codeChallenge, port): Promise<any> {
    return await invoke("discord_oauth_pkce_authorize", { applicationId, scopes, codeChallenge, port });
  },
  async rpcAuthorize(applicationId, scopes): Promise<string> {
    return await invoke<string>("discord_rpc_authorize", { applicationId, scopes });
  },
  async exchangeSecret(applicationId, code, redirectUri): Promise<string> {
    return await invoke<string>("discord_rpc_exchange_secret", { applicationId, code, redirectUri });
  },

  async exchangePkce(applicationId, code, codeVerifier, redirectUri): Promise<string> {
    return await invoke<string>("discord_rpc_exchange_pkce", { applicationId, code, codeVerifier, redirectUri });
  },
  async authenticateWithToken(accessToken): Promise<string> {
    return await invoke<string>("discord_rpc_authenticate_token", { accessToken });
  },
};