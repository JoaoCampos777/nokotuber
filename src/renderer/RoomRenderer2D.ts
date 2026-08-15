import { ROOM_CANVAS } from "../room/roomTypes";
import type { RoomParticipant, RoomAvatar } from "../room/roomTypes";
import type { ExpressionImages } from "../project/expressionTypes";
import type { ParticipantEffects, ActiveRoomReaction } from "../effects/participantEffects";
import { resolveParticipantEffects, resolveReactionTransform, participantSeed } from "../effects/participantEffectResolver";

export interface RoomFrameInput {
  participants: RoomParticipant[];                 // visíveis, ordenados por zIndex
  avatars: Record<string, RoomAvatar>;             // por id
  effects: Record<string, ParticipantEffects>;     // efeitos por participantId
  reactions?: Record<string, ActiveRoomReaction>;  // reações de voz ativas por participantId
  background: { mode: "transparent" | "color" | "chroma" | string; color: string };
}

export interface RoomRendererOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  transparent?: boolean;
  getState: () => RoomFrameInput;
}

/** Escolhe a imagem do avatar conforme estado de fala/piscada, com fallback entre slots. */
function pickImage(images: ExpressionImages, talking: boolean, blinking: boolean): string | null {
  if (talking && blinking) return images.blinkOpen ?? images.mouthOpen ?? images.mouthClosed ?? null;
  if (talking)             return images.mouthOpen ?? images.mouthClosed ?? null;
  if (blinking)            return images.blinkClosed ?? images.mouthClosed ?? null;
  return images.mouthClosed ?? null;
}

export class RoomRenderer2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private transparent: boolean;
  private getState: () => RoomFrameInput;
  private animId: number | null = null;
  private cache = new Map<string, HTMLImageElement>();
  private blink = new Map<string, { until: number; next: number }>();

  constructor(o: RoomRendererOptions) {
    this.canvas = o.canvas;
    this.canvas.width = o.width;
    this.canvas.height = o.height;
    this.transparent = o.transparent ?? false;
    this.getState = o.getState;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    this.ctx = ctx;
    this.animId = requestAnimationFrame(this.loop);
  }

  resize(w: number, h: number): void { this.canvas.width = w; this.canvas.height = h; }
  destroy(): void { if (this.animId) cancelAnimationFrame(this.animId); }

  private loop = (): void => { this.render(); this.animId = requestAnimationFrame(this.loop); };

  private getImage(url: string | null): HTMLImageElement | null {
    if (!url) return null;
    let img = this.cache.get(url);
    if (!img) { img = new Image(); img.src = url; this.cache.set(url, img); }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  /** Piscada independente por participante (intervalos aleatórios). */
  private isBlinking(id: string, now: number): boolean {
    let st = this.blink.get(id);
    if (!st) { st = { until: 0, next: now + 2000 + Math.random() * 4000 }; this.blink.set(id, st); }
    if (now >= st.next) { st.until = now + 130; st.next = now + 2500 + Math.random() * 5000; }
    return now < st.until;
  }

  private render(): void {
    const { ctx, canvas } = this;
    let s: RoomFrameInput;
    try { s = this.getState(); }
    catch { s = { participants: [], avatars: {}, effects: {}, background: { mode: "transparent", color: "#00FF00" } }; }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo
    const mode = s.background.mode;
    if (mode === "color" || mode === "chroma") {
      ctx.fillStyle = s.background.color || (mode === "chroma" ? "#00FF00" : "#000000");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (!this.transparent) {
      ctx.fillStyle = "#1f1818";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Letterbox: mapeia o espaço lógico 1920x1080 para o canvas mantendo proporção
    const sc = Math.min(canvas.width / ROOM_CANVAS.width, canvas.height / ROOM_CANVAS.height);
    const ox = (canvas.width  - ROOM_CANVAS.width  * sc) / 2;
    const oy = (canvas.height - ROOM_CANVAS.height * sc) / 2;

    const now = performance.now();
    for (const p of s.participants) {
      const avatar = s.avatars[p.avatarId];
      const talking = p.isSpeaking;   // o renderer lê SOMENTE isSpeaking (fonte vem do router)
      const blinking = this.isBlinking(p.id, now);
      const url = avatar ? pickImage(avatar.images, talking, blinking) : null;
      const img = this.getImage(url);

      const seed = participantSeed(p.id);
      const fx = resolveParticipantEffects(s.effects?.[p.id], talking, now, seed);
      const rx = resolveReactionTransform(s.reactions?.[p.id], now, seed);
      // Combina efeitos contínuos (fx) + reação de voz transitória (rx).
      const dx = fx.dx + rx.dx;
      const dy = fx.dy + rx.dy;
      const rotAdd = fx.rotationAdd + rx.rotationAdd;
      const scaleMul = fx.scaleMul * rx.scaleMul;
      const highlight = Math.max(fx.highlight, rx.highlight);

      ctx.setTransform(sc, 0, 0, sc, ox, oy);
      ctx.translate(p.position.x + dx, p.position.y + dy);
      const rot = p.rotation + rotAdd;
      if (rot) ctx.rotate((rot * Math.PI) / 180);
      ctx.scale((p.mirrorX ? -1 : 1) * scaleMul, scaleMul);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
      if (highlight > 0) {
        ctx.shadowColor = `rgba(255,210,140,${0.7 * highlight})`;
        ctx.shadowBlur = 45 * highlight;
      }


      if (img) {
        const baseH = ROOM_CANVAS.height * 0.8;
        const fs = (baseH / img.naturalHeight) * p.scale;
        const w = img.naturalWidth  * fs;
        const h = img.naturalHeight * fs;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        this.drawPlaceholder(p);
      }
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1;
    }


    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawPlaceholder(p: RoomParticipant): void {
    const { ctx } = this;
    const w = 360 * p.scale, h = 520 * p.scale;
    ctx.fillStyle = "rgba(162,24,55,0.22)";
    ctx.strokeStyle = "#a21837";
    ctx.lineWidth = 3;
    this.roundRect(-w / 2, -h / 2, w, h, 18);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f4ebe8";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 38px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(p.name, 0, -10);
    ctx.font = "400 22px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#d8b0b8";
    ctx.fillText("sem imagem", 0, 30);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}