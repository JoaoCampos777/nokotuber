import { get } from "svelte/store";
import { setParticipantSpeaking, room } from "../room/roomStore";
import { audioRouting } from "./audioBindingStore";
import type { SpeakingEvent } from "./speakingTypes";

/**
 * Núcleo do desacoplamento: recebe um SpeakingEvent de QUALQUER fonte e decide
 * quais participantes passam a falar. O renderer só lê participant.isSpeaking.
 */
export function routeSpeakingEvent(ev: SpeakingEvent): void {
  // Teste manual → afeta somente aquele participante (override de teste)
  if (ev.providerType === "manual_test" && ev.participantId) {
    setParticipantSpeaking(ev.participantId, ev.isSpeaking);
    return;
  }

  // Microfone compartilhado → respeita o micMode da sala
  if (ev.providerType === "shared_microphone") {
    const routing = get(audioRouting);
    if (routing.micMode === "off") return;
    for (const p of get(room).participants) {
      const b = routing.bindings.find((x) => x.participantId === p.id);
      if (!b || b.mode !== "shared_microphone") continue;
      if (routing.micMode === "selected" && routing.micTargetParticipantId !== p.id) continue;
      setParticipantSpeaking(p.id, ev.isSpeaking);
    }
    return;
  }

  // Discord / fontes externas (stub) → mapeia usuário externo → participante via binding
  if (ev.externalUserId) {
    const b = get(audioRouting).bindings.find((x) => x.externalUserId === ev.externalUserId);
    if (b) setParticipantSpeaking(b.participantId, ev.isSpeaking);
  }
}

