import { writable, get } from "svelte/store";

export const audioLevel     = writable<number>(0);    // 0..100
export const isTalking      = writable<boolean>(false);
export const audioThreshold = writable<number>(15);
export const isAudioActive  = writable<boolean>(false);

let analyser:    AnalyserNode | null = null;
let animFrameId: number       | null = null;
let stream:      MediaStream  | null = null;
let simulateTimer: ReturnType<typeof setTimeout> | null = null;

export async function startAudioCapture(): Promise<void> {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx    = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    analyser     = ctx.createAnalyser();
    analyser.fftSize               = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    isAudioActive.set(true);
    tickAudio();
  } catch (err) {
    console.error("[audio] Falha ao acessar microfone:", err);
    isAudioActive.set(false);
  }
}

export function stopAudioCapture(): void {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  stream?.getTracks().forEach((t) => t.stop());
  analyser    = null;
  stream      = null;
  animFrameId = null;
  isAudioActive.set(false);
  audioLevel.set(0);
  isTalking.set(false);
}

/**
 * Simula fala por alguns segundos (para testar efeitos sem microfone).
 * Só funciona quando o mic está desligado.
 */
export function simulateTalking(durationMs: number = 2500): void {
  if (get(isAudioActive)) return;
  if (simulateTimer) clearTimeout(simulateTimer);
  isTalking.set(true);
  audioLevel.set(60);
  simulateTimer = setTimeout(() => {
    isTalking.set(false);
    audioLevel.set(0);
  }, durationMs);
}

function tickAudio(): void {
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const avg   = data.reduce((a, b) => a + b, 0) / data.length;
  const level = Math.min(100, (avg / 128) * 100);
  audioLevel.set(level);
  isTalking.set(level > get(audioThreshold));
  animFrameId = requestAnimationFrame(tickAudio);
}