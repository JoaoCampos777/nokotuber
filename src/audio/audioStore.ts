import { currentAudioConstraints, refreshAudioDevices, selectedDeviceId, audioError } from "./audioDeviceManager";
import { writable, get } from "svelte/store";
import type { VoiceReactionEffectType, VoiceReactionRule } from "./voiceReactionTypes";
import { defaultReactionRule } from "./voiceReactionTypes";

export const audioLevel     = writable<number>(0);    // 0..100
export const isTalking      = writable<boolean>(false);
export const audioThreshold = writable<number>(15);   // limiar de FALA
export const isAudioActive  = writable<boolean>(false);
export const speechThreshold = audioThreshold;

// ─── Reação por intensidade de voz ───
export const voiceReactionRule    = writable<VoiceReactionRule>(defaultReactionRule());
export const isReacting           = writable<boolean>(false);
export const activeVoiceReactions = writable<VoiceReactionEffectType[]>([]);

let analyser:    AnalyserNode | null = null;
let animFrameId: number       | null = null;
let stream:      MediaStream  | null = null;
let simulateTimer: ReturnType<typeof setTimeout> | null = null;

let lastReactionAt = 0;
let reactionTimer: ReturnType<typeof setTimeout> | null = null;

function clamp(v: number): number { return Math.max(0, Math.min(100, v)); }

export async function startAudioCapture(): Promise<void> {
  audioError.set("");
  try {
    stream = await navigator.mediaDevices.getUserMedia(currentAudioConstraints());
    const ctx    = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    analyser     = ctx.createAnalyser();
    analyser.fftSize               = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    isAudioActive.set(true);
    tickAudio();
  } catch (err: any) {
    console.error("[audio] Falha ao acessar microfone:", err);
    isAudioActive.set(false);
    if (err?.name === "NotAllowedError") {
      audioError.set("Não foi possível acessar o microfone. Verifique as permissões do sistema.");
    } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
      // device escolhido sumiu → volta pro padrão e tenta avisar
      selectedDeviceId.set("default");
      audioError.set("Microfone não encontrado. Usando o padrão do sistema.");
    } else {
      audioError.set("Não foi possível iniciar o microfone.");
    }
  }
}

/** Reinicia a captura no novo dispositivo, se o mic estiver ligado. */
export async function restartAudioCapture(): Promise<void> {
  const wasActive = get(isAudioActive);
  stopAudioCapture();
  if (wasActive) await startAudioCapture();
}

/** Reexporta utilidades de device para a UI importar de um lugar só. */
export { refreshAudioDevices, selectedDeviceId, audioError, setAudioDevice } from "./audioDeviceManager";
export { audioDevices } from "./audioDeviceManager";

export function stopAudioCapture(): void {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  stream?.getTracks().forEach((t) => t.stop());
  analyser = null; stream = null; animFrameId = null;
  isAudioActive.set(false);
  audioLevel.set(0);
  isTalking.set(false);
}

export function simulateTalking(durationMs: number = 2500): void {
  if (get(isAudioActive)) return;
  if (simulateTimer) clearTimeout(simulateTimer);
  isTalking.set(true);
  audioLevel.set(60);
  simulateTimer = setTimeout(() => { isTalking.set(false); audioLevel.set(0); }, durationMs);
}

/** Dispara a reação manualmente (botão de teste). */
export function simulateReaction(): void {
  const rule = get(voiceReactionRule);
  isTalking.set(true);
  audioLevel.set(Math.max(rule.triggerThreshold + 10, 90)); // dispara via subscribe
  setTimeout(() => {
    if (!get(isAudioActive)) { audioLevel.set(0); isTalking.set(false); }
  }, 400);
}
/** Alias de compatibilidade. */
export const simulateScare = simulateReaction;

// ─── Lógica de reação ───
function evaluateReaction(level: number): void {
  const rule = get(voiceReactionRule);
  if (!rule.enabled || rule.effects.length === 0) return;
  if (get(isReacting)) return;
  if (performance.now() - lastReactionAt < rule.cooldownMs) return;
  if (level >= rule.triggerThreshold) triggerVoiceReaction();
}

export function triggerVoiceReaction(): void {
  const rule = get(voiceReactionRule);
  if (!rule.enabled || rule.effects.length === 0) return;
  lastReactionAt = performance.now();
  isReacting.set(true);
  activeVoiceReactions.set([...rule.effects]);
  if (reactionTimer) clearTimeout(reactionTimer);
  reactionTimer = setTimeout(stopVoiceReaction, rule.durationMs);
}

export function stopVoiceReaction(): void {
  if (reactionTimer) { clearTimeout(reactionTimer); reactionTimer = null; }
  isReacting.set(false);
  activeVoiceReactions.set([]);
}

// ─── Setters utilitários ───
export function setSpeechThreshold(v: number): void { audioThreshold.set(clamp(v)); }
export function setReactionThreshold(v: number): void {
  voiceReactionRule.update((r) => ({ ...r, triggerThreshold: clamp(v) }));
}
export function setMicrophoneEnabled(enabled: boolean): void {
  if (enabled) startAudioCapture(); else stopAudioCapture();
}
export function updateVoiceReactionRule(patch: Partial<VoiceReactionRule>): void {
  voiceReactionRule.update((r) => ({ ...r, ...patch }));
}
export function resetAudioState(): void {
  stopAudioCapture();
  stopVoiceReaction();
  audioThreshold.set(15);
  voiceReactionRule.set(defaultReactionRule());
  lastReactionAt = 0;
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

// ─── Migração + persistência ───
const VR_KEY = "nokotuber:voiceReaction:v1";
const TH_KEY = "nokotuber:speechThreshold:v1";

function isPerfWin(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.location.search.includes("performance")) return true;
    if (window.location.hash.includes("performance"))   return true;
    const label = (window as any)?.__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
    return label === "performance";
  } catch { return false; }
}

/** Converte regras antigas (effectType único) para o novo formato (effects[]). */
function migrateRule(raw: any): VoiceReactionRule {
  const base = defaultReactionRule();
  if (!raw || typeof raw !== "object") return base;
  const merged: any = { ...base, ...raw };
  if (!Array.isArray(merged.effects)) {
    merged.effects = raw.effectType && raw.effectType !== "none" ? [raw.effectType] : [...base.effects];
  }
  delete merged.effectType;
  return merged as VoiceReactionRule;
}

// Avalia a reação só na janela do Editor (a de performance recebe via eventos)
if (!isPerfWin()) {
  audioLevel.subscribe((level) => evaluateReaction(level));
}

try {
  const raw = localStorage.getItem(VR_KEY);
  if (raw) voiceReactionRule.set(migrateRule(JSON.parse(raw)));
  const th = localStorage.getItem(TH_KEY);
  if (th) audioThreshold.set(clamp(parseInt(th)));
} catch {}

if (!isPerfWin()) {
  voiceReactionRule.subscribe((r) => { try { localStorage.setItem(VR_KEY, JSON.stringify(r)); } catch {} });
  audioThreshold.subscribe((t)  => { try { localStorage.setItem(TH_KEY, String(t)); } catch {} });
}