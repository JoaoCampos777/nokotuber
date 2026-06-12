import { writable, get } from "svelte/store";
import type {
  AudioRouting, ParticipantAudioBinding, SpeakingProviderInfo, AudioBindingMode, MicRoomMode,
} from "./speakingTypes";
import { AUDIO_ROUTING_VERSION } from "./speakingTypes";
import { room } from "../room/roomStore";

const ROUTING_KEY = "nokotuber:audioRouting:v1";

function defaultProviders(): SpeakingProviderInfo[] {
  return [
    { id: "provider_shared_microphone", type: "shared_microphone", name: "Microfone compartilhado", enabled: true,  available: true,  requiresSetup: false, description: "Usa o microfone do app para acionar participantes." },
    { id: "provider_manual",            type: "manual_test",       name: "Teste manual",            enabled: true,  available: true,  requiresSetup: false, description: "Aciona a fala manualmente, por participante." },
    { id: "provider_discord_rpc",       type: "discord_rpc_experimental", name: "Discord RPC (experimental)", enabled: false, available: false, requiresSetup: true, description: "Experimental. Pode exigir aprovação no Discord Developer Portal." },
    { id: "provider_discord_bot",       type: "discord_bot_companion",    name: "Discord Bot Companion (futuro)", enabled: false, available: false, requiresSetup: true, description: "Futuro: bot oficial + ponte local." },
  ];
}

export function defaultAudioRouting(): AudioRouting {
  return {
    version: AUDIO_ROUTING_VERSION,
    defaultProviderId: "provider_shared_microphone",
    micMode: "all",
    micTargetParticipantId: null,
    providers: defaultProviders(),
    bindings: [],
  };
}

function mergeRouting(raw: any): AudioRouting {
  const base = defaultAudioRouting();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: AUDIO_ROUTING_VERSION,
    defaultProviderId: raw.defaultProviderId ?? base.defaultProviderId,
    micMode: (["all", "selected", "off"].includes(raw.micMode) ? raw.micMode : base.micMode) as MicRoomMode,
    micTargetParticipantId: raw.micTargetParticipantId ?? null,
    providers: Array.isArray(raw.providers) && raw.providers.length ? raw.providers : base.providers,
    bindings: Array.isArray(raw.bindings) ? raw.bindings : [],
  };
}

function loadRouting(): AudioRouting {
  try {
    const raw = localStorage.getItem(ROUTING_KEY);
    if (raw) return mergeRouting(JSON.parse(raw));
  } catch {}
  return defaultAudioRouting();
}

function isPerfWin(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.location.search.includes("performance")) return true;
    if (window.location.hash.includes("performance"))   return true;
    const label = (window as any)?.__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
    return label === "performance";
  } catch { return false; }
}

export const audioRouting = writable<AudioRouting>(loadRouting());

if (!isPerfWin()) {
  audioRouting.subscribe((r) => { try { localStorage.setItem(ROUTING_KEY, JSON.stringify(r)); } catch {} });
}

// Garante um binding por participante (default: microfone compartilhado) e remove órfãos.
room.subscribe((r) => {
  const ids = r.participants.map((p) => p.id);
  const cur = get(audioRouting);
  let bindings = cur.bindings.filter((b) => ids.includes(b.participantId));
  let changed = bindings.length !== cur.bindings.length;
  for (const id of ids) {
    if (!bindings.some((b) => b.participantId === id)) {
      bindings = [...bindings, {
        participantId: id,
        providerId: "provider_shared_microphone",
        sourceId: `mic_${id}`,
        mode: "shared_microphone",
        enabled: true,
      }];
      changed = true;
    }
  }
  if (changed) audioRouting.update((a) => ({ ...a, bindings }));
});

// ─── Ações ───
export function getBinding(participantId: string): ParticipantAudioBinding | undefined {
  return get(audioRouting).bindings.find((b) => b.participantId === participantId);
}

export function setBinding(participantId: string, patch: Partial<ParticipantAudioBinding>): void {
  audioRouting.update((a) => ({
    ...a,
    bindings: a.bindings.map((b) => (b.participantId === participantId ? { ...b, ...patch } : b)),
  }));
}

export function setParticipantSource(participantId: string, mode: AudioBindingMode): void {
  setBinding(participantId, { mode });
}

export function setMicMode(mode: MicRoomMode): void {
  audioRouting.update((a) => ({ ...a, micMode: mode }));
}

export function setMicTarget(participantId: string | null): void {
  audioRouting.update((a) => ({ ...a, micTargetParticipantId: participantId }));
}

export function bindDiscordUser(participantId: string, userId: string, userName: string): void {
  setBinding(participantId, { mode: "discord_user", externalUserId: userId, externalUserName: userName });
}

export function unbindDiscordUser(participantId: string): void {
  setBinding(participantId, { mode: "shared_microphone", externalUserId: undefined, externalUserName: undefined });
}

/** Vincula um participante da sala a um usuário do Nokotuber Companion (por externalUserId). */
export function bindRemoteCompanionUser(participantId: string, userId: string, userName: string): void {
  setBinding(participantId, { mode: "remote_companion_user", sourceId: `companion:${userId}`, externalUserId: userId, externalUserName: userName });
}
export function unbindRemoteCompanionUser(participantId: string): void {
  setBinding(participantId, { mode: "shared_microphone", externalUserId: undefined, externalUserName: undefined });
}

/** Aplica o roteamento de áudio vindo de um projeto carregado (.noko). */
export function applyAudioRouting(raw: any): void { audioRouting.set(mergeRouting(raw)); }
