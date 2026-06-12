import { get } from "svelte/store";
import { isTalking } from "./audioStore";
import { room } from "../room/roomStore";
import { routeSpeakingEvent } from "./participantAudioRouter";

/**
 * Liga o microfone compartilhado à camada de fala (só atua no modo sala;
 * no modo avatar único o pipeline antigo continua mandando).
 */
export function startSharedMicProvider(): () => void {
  let last = false;
  const unsub = isTalking.subscribe((talking) => {
    if (talking === last) return;
    last = talking;
    if (!get(room).enabled) return;
    routeSpeakingEvent({
      sourceId: "shared_microphone",
      isSpeaking: talking,
      timestamp: Date.now(),
      providerType: "shared_microphone",
    });
  });
  return () => unsub();
}