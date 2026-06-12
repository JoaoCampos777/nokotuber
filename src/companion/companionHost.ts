import { joinAsHost, heartbeatMsg } from "./companionMessages";

export interface HostHandlers {
  onJoin(id: string, name: string): void;
  onSpeaking(id: string, isSpeaking: boolean, volume: number): void;
  onLeave(id: string): void;
  onStatus(status: "connecting" | "connected" | "disconnected" | "error", error?: string): void;
}

let ws: WebSocket | null = null;
let hb: any = 0;

export function startHost(relayUrl: string, roomCode: string, h: HostHandlers): void {
  stopHost();
  try { ws = new WebSocket(relayUrl); }
  catch { h.onStatus("error", "URL do relay inválida."); return; }
  h.onStatus("connecting");
  ws.onopen = () => {
    ws?.send(joinAsHost(roomCode));
    hb = setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send(heartbeatMsg()); }, 15000);
  };
  ws.onmessage = (ev) => {
    let m: any; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === "host_ready") h.onStatus("connected");
    else if (m.type === "participant_joined") h.onJoin(m.id, m.name ?? "Participante");
    else if (m.type === "speaking") h.onSpeaking(m.id, !!m.isSpeaking, Number(m.volume) || 0);
    else if (m.type === "participant_left") h.onLeave(m.id);
    else if (m.type === "error") h.onStatus("error", m.message);
  };
  ws.onclose = () => { clearInterval(hb); h.onStatus("disconnected"); };
  ws.onerror = () => h.onStatus("error", "Não consegui conectar no relay.");
}
export function stopHost(): void { clearInterval(hb); if (ws) { try { ws.close(); } catch {} ws = null; } }