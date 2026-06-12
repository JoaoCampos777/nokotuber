import { writable } from "svelte/store";
import type { CompanionClientState } from "./companionTypes";
import { helloMsg, speakingMsg, heartbeatMsg } from "./companionMessages";

const TAG = "[Companion]";

export const companionClient = writable<CompanionClientState>({
  enabled: true, clientId: "", displayName: "", hostUrl: "", status: "disabled",
  selectedInputDeviceId: "", volume: 0, isSpeaking: false,
});
export const companionLog = writable<string[]>([]);
export const vadSettings = writable({ threshold: 12, smoothing: 0.6, releaseMs: 250 });
let settings = { threshold: 12, smoothing: 0.6, releaseMs: 250 };
vadSettings.subscribe((s) => (settings = s));

function L(...args: any[]): void {
  const line = args.map((a) => typeof a === "string" ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()).join(" ");
  console.log(TAG, line);
  const ts = new Date().toLocaleTimeString();
  companionLog.update((l) => [...l, `${ts}  ${line}`].slice(-80));
}

let ws: WebSocket | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let micStream: MediaStream | null = null;
let rafId = 0, hbTimer: any = 0;
let speaking = false, smoothVol = 0, belowSince = 0;
let _clientId = "", _displayName = "", _roomCode = "", _micDeviceId = "";

function genId(): string { return "remote_" + Math.random().toString(36).slice(2, 9); }
function setError(msg: string): void { L("ERRO:", msg); companionClient.update((s) => ({ ...s, status: "error", error: msg })); }

export async function listMics(): Promise<MediaDeviceInfo[]> {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
  } catch (e) { L("listMics falhou:", String(e)); return []; }
}

export function connectCompanion(displayName: string, hostUrl: string, roomCode: string, deviceId: string): void {
  disconnectCompanion();
  companionLog.set([]);
  _clientId = genId();
  _displayName = (displayName || "Participante").trim();
  _roomCode = (roomCode || "").trim().toUpperCase();
  _micDeviceId = deviceId || "";
  const url = (hostUrl || "").trim();

  L("connectCompanion →", { url, clientId: _clientId, displayName: _displayName, roomCode: _roomCode });
  companionClient.update((s) => ({ ...s, clientId: _clientId, displayName: _displayName, hostUrl: url, selectedInputDeviceId: _micDeviceId, status: "connecting", error: undefined }));

  if (!url) { setError("Informe o endereço do Host (ex: ws://localhost:8787)."); return; }
  if (!url.startsWith("ws://") && !url.startsWith("wss://")) { setError(`O endereço precisa começar com ws:// ou wss:// (você digitou: "${url}").`); return; }
  L("origem da página:", location.origin, "| se for https e o host for ws://, o navegador BLOQUEIA (mixed content)");

  try { ws = new WebSocket(url); }
  catch (e) { setError(`Não consegui abrir o WebSocket: ${String(e)}`); return; }
  L("WebSocket criado, readyState =", ws.readyState, "(0=CONNECTING)");

  ws.onopen = () => {
    const payload = helloMsg(_clientId, _displayName, _roomCode);
    L("onopen ✓ socket aberto. Enviando hello:", payload);
    ws?.send(payload);
    companionClient.update((s) => ({ ...s, status: "connecting", error: undefined }));
  };
  ws.onmessage = (ev) => {
    L("onmessage (bruto):", ev.data);
    let m: any;
    try { m = JSON.parse(typeof ev.data === "string" ? ev.data : ""); }
    catch (e) { L("mensagem não-JSON, ignorando:", String(e)); return; }
    if (m.type === "welcome") {
      L("welcome ✓ → CONECTADO. remoteUserId =", m.remoteUserId);
      companionClient.update((s) => ({ ...s, status: "connected", error: undefined }));
      startMicAndVad();
    } else if (m.type === "error") {
      setError(`O Host recusou: ${m.message ?? "(sem mensagem)"}`);
    } else { L("mensagem de tipo não tratado:", m.type); }
  };
  ws.onerror = (ev) => {
    L("onerror (geralmente conexão recusada/bloqueada):", String((ev as any)?.message ?? ev?.type ?? ev));
    companionClient.update((s) => s.status === "connected" ? s : ({ ...s, status: "error", error: s.error ?? "Erro de conexão. Veja o log abaixo / Console (F12)." }));
  };
  ws.onclose = (ev) => {
    L("onclose:", { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
    clearInterval(hbTimer);
    companionClient.update((s) => ({ ...s, status: "disconnected", error: s.error ?? `Conexão encerrada (code ${ev.code}${ev.reason ? `, ${ev.reason}` : ""}).` }));
  };
}

export function sendTestHello(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) { setError("WebSocket não está aberto. Clique em Conectar primeiro."); return; }
  const payload = helloMsg(_clientId || "teste_local", _displayName || "Teste Local", _roomCode || "");
  L("TESTE → enviando hello manual:", payload);
  ws.send(payload);
}

async function startMicAndVad(): Promise<void> {
  try { micStream = await navigator.mediaDevices.getUserMedia({ audio: _micDeviceId ? { deviceId: { exact: _micDeviceId } } : true }); }
  catch (e) { L("mic indisponível (segue conectado, sem detectar fala):", String(e)); companionClient.update((s) => ({ ...s, error: "Conectado, mas sem microfone — a fala não será detectada." })); return; }
  try {
    audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 512; src.connect(analyser);
    hbTimer = setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send(heartbeatMsg()); }, 5000);
    loopVad(); L("mic + VAD iniciados ✓");
  } catch (e) { L("falha ao iniciar áudio (segue conectado):", String(e)); }
}

function loopVad(): void {
  if (!analyser) return;
  const buf = new Uint8Array(analyser.frequencyBinCount);
  const tick = () => {
    if (!analyser) return;
    analyser.getByteFrequencyData(buf);
    let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i];
    const raw = Math.min(100, Math.round(((sum / buf.length) / 255) * 200));
    smoothVol = settings.smoothing * smoothVol + (1 - settings.smoothing) * raw;
    const v = Math.round(smoothVol);
    companionClient.update((s) => ({ ...s, volume: v }));
    const now = performance.now();
    if (v >= settings.threshold) { belowSince = 0; if (!speaking) { speaking = true; pushSpeaking(true, v); } }
    else { if (belowSince === 0) belowSince = now; if (speaking && now - belowSince >= settings.releaseMs) { speaking = false; pushSpeaking(false, v); } }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}
function pushSpeaking(is: boolean, vol: number): void {
  companionClient.update((s) => ({ ...s, isSpeaking: is }));
  if (ws?.readyState === WebSocket.OPEN) { ws.send(speakingMsg(is, vol)); L("→ speaking:", is, vol); }
}

export function disconnectCompanion(): void {
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  clearInterval(hbTimer);
  if (ws) { try { ws.onclose = null; ws.close(); } catch {} ws = null; }
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
  analyser = null; speaking = false; smoothVol = 0; belowSince = 0;
  companionClient.update((s) => ({ ...s, isSpeaking: false, volume: 0 }));
}