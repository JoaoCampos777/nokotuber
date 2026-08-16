import type { ViewSettings } from "../view/viewTypes";
import type { AvatarEffect } from "../effects/effectTypes";
import type { Addon } from "../addons/addonTypes";
import type { AvatarState } from "../avatar/avatarController";
import { EffectSystem } from "../effects/effectSystem";
import { DEFAULT_VIEW_SETTINGS } from "../view/viewTypes";

/** Tudo que o renderer precisa por frame. */
export interface FrameInput {
  imageUrl:   string | null;
  view:       ViewSettings;
  effects:    AvatarEffect[];
  state:      AvatarState;
  audioLevel: number;   // 0..1
  /** Expressão ativa — colore o placeholder enquanto não há imagem. */
  expression?: { name: string; color: string } | null;
  /** Reação de voz aplicada apenas ao personagem (preserva chroma key). */
  voiceReaction?: {
    types: ("shake" | "strongShake" | "randomMovement" | "scalePulse" | "expressionSwap" | "colorFlash")[];
    intensity: number;  // 0..100
    isReacting: boolean;
  } | null;
  /** Acessórios sobrepostos (Fase 3). */
  addons?: Addon[];
}

export interface RendererOptions {
  canvas:       HTMLCanvasElement;
  width:        number;
  height:       number;
  transparent?: boolean;            // true = janela performance
  getState:     () => FrameInput;   // fornece dados frescos a cada frame
}

export class Renderer2D {
  private canvas:      HTMLCanvasElement;
  private ctx:         CanvasRenderingContext2D;

  private targetUrl:   string | null = null;            // imagem desejada
  private drawnImg:    HTMLImageElement | null = null;  // imagem desenhada agora
  private cache:       Map<string, HTMLImageElement> = new Map();

  // Estado interno das reações de voz (aplicadas só ao personagem, não ao fundo)
  private vrRandomTarget: { x: number; y: number } = { x: 0, y: 0 };
  private vrRandomLast:   number = 0;

  private animFrameId: number  | null = null;
  private transparent: boolean;
  private getState:    () => FrameInput;
  private effectSystem = new EffectSystem();
  private lastTime     = performance.now();

  constructor(options: RendererOptions) {
    this.canvas        = options.canvas;
    this.canvas.width  = options.width;
    this.canvas.height = options.height;
    this.transparent   = options.transparent ?? false;
    this.getState      = options.getState;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D não disponível");
    this.ctx = ctx;

    this.startRenderLoop();
  }

  resize(w: number, h: number): void {
    this.canvas.width  = w;
    this.canvas.height = h;
  }

  destroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  // ─── loop ──────────────────────────────────────────────
  private startRenderLoop(): void {
    const tick = () => {
      this.render();
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private ensureImage(url: string | null): void {
    if (url === this.targetUrl) return;
    this.targetUrl = url;

    if (!url) {
      this.drawnImg = null;
      return;
    }

    // Já está em cache e pronta? troca instantânea, sem piscar
    const cached = this.cache.get(url);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      this.drawnImg = cached;
      return;
    }

    // Carrega a nova SEM apagar a atual — só troca quando estiver pronta
    const img = this.cache.get(url) ?? new Image();
    if (!this.cache.has(url)) this.cache.set(url, img);

    const apply = () => {
      // Só aplica se ainda for a imagem desejada
      if (url === this.targetUrl && img.naturalWidth > 0) {
        this.drawnImg = img;
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      apply();
    } else {
      img.onload = apply;
      if (!img.src) img.src = url;
    }
  }

  private render(): void {
    const { ctx, canvas } = this;
    const nowT  = performance.now();
    const delta = nowT - this.lastTime;
    this.lastTime = nowT;

    // Estado do frame (com fallback seguro)
    let s: FrameInput;
    try {
      s = this.getState();
    } catch {
      s = {
        imageUrl: null,
        view: DEFAULT_VIEW_SETTINGS,
        effects: [],
        state: "idle",
        audioLevel: 0,
      };
    }

    const view = s.view ?? DEFAULT_VIEW_SETTINGS;

    this.ensureImage(s.imageUrl);

    // ─── Fundo ───
    this.drawBackground(view);

    if (!this.drawnImg || this.drawnImg.naturalWidth <= 0) {
      if (!this.targetUrl) this.drawPlaceholder(s.expression ?? null);
      return;
    }

    // ─── Efeitos ───
    const fx = this.effectSystem.compute(
      s.effects ?? [],
      s.state ?? "idle",
      s.audioLevel ?? 0,
      view.movementScale ?? 1,
      nowT,
      delta,
    );

    // ─── Tamanho ───
    const img       = this.drawnImg;
    const baseScale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const sizeMul   = view.avatarSizeMode === "manual" ? view.sizeMultiplier : 1;

    // ─── Reação de voz aplicada APENAS ao personagem (o fundo fica intacto) ───
    // Vários efeitos podem somar ao mesmo tempo (ex.: tremor forte + pulso).
    const vr    = s.voiceReaction;
    const vrI   = Math.max(0, Math.min(1, (vr?.intensity ?? 0) / 100));
    const types = vr?.types ?? [];
    let vrX = 0, vrY = 0, vrRot = 0, vrScale = 1;
    if (vr && vr.isReacting && types.length) {
      const t = nowT / 1000;
      if (types.includes("shake")) {
        const amp = 2 + vrI * 6;
        vrX += Math.sin(t * 30 * Math.PI * 2) * amp;
      }
      if (types.includes("strongShake")) {
        const amp = 6 + vrI * 18;
        vrX   += Math.sin(t * 22 * Math.PI * 2)   * amp;
        vrY   += Math.cos(t * 22 * Math.PI * 2.1) * amp * 0.8;
        vrRot += Math.sin(t * 22 * Math.PI * 2)   * 0.05;
      }
      if (types.includes("randomMovement")) {
        const amp = 8 + vrI * 22;
        if (nowT - this.vrRandomLast > 80) {
          this.vrRandomLast = nowT;
          this.vrRandomTarget = {
            x: (Math.random() * 2 - 1) * amp,
            y: (Math.random() * 2 - 1) * amp,
          };
        }
        vrX += this.vrRandomTarget.x;
        vrY += this.vrRandomTarget.y;
      }
      if (types.includes("scalePulse")) {
        const amp = 0.05 + vrI * 0.25;
        vrScale *= 1 + amp * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 3));
      }
    }

    const scaleX = baseScale * sizeMul * fx.scaleX * vrScale;
    const scaleY = baseScale * sizeMul * fx.scaleY * vrScale;

    const w = img.naturalWidth  * scaleX;
    const h = img.naturalHeight * scaleY;

    // ─── Posição ───
    const cx = canvas.width  / 2 + (view.positionX ?? 0) + fx.x + vrX;
    const cy = canvas.height / 2 + (view.positionY ?? 0) + fx.y + vrY;

    // ─── Filtros (hue/sat/bri) + brilho do efeito ───
    const f        = view.filters ?? DEFAULT_VIEW_SETTINGS.filters;
    const briTotal = Math.max(0, f.brightness * fx.brightness);

    const refScale = baseScale * sizeMul;
    const avatarRot = fx.rotation + vrRot;
    const addons = s.addons ?? [];

    // Add-ons ATRÁS do personagem (zIndex < 0).
    if (addons.length) this.drawSoloAddons(addons, true, cx, cy, avatarRot, refScale, fx.alpha);

    ctx.save();
    ctx.filter = `hue-rotate(${f.hue}deg) saturate(${f.saturation}) brightness(${briTotal})`;
    ctx.globalAlpha = fx.alpha;
    ctx.translate(cx, cy);
    if (fx.rotation || vrRot) ctx.rotate(fx.rotation + vrRot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    // Add-ons À FRENTE do personagem (zIndex >= 0).
    if (addons.length) this.drawSoloAddons(addons, false, cx, cy, avatarRot, refScale, fx.alpha);
  }

  private getCachedImage(url: string): HTMLImageElement | null {
    let img = this.cache.get(url);
    if (!img) { img = new Image(); img.src = url; this.cache.set(url, img); }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  /** Desenha os add-ons do personagem, acompanhando centro/rotação/tamanho do avatar. */
  private drawSoloAddons(addons: Addon[], behind: boolean, cx: number, cy: number, rot: number, refScale: number, alpha: number): void {
    const { ctx } = this;
    const list = addons
      .filter((a) => a.visible && a.image && (behind ? a.zIndex < 0 : a.zIndex >= 0))
      .sort((a, b) => a.zIndex - b.zIndex);
    for (const ad of list) {
      const img = this.getCachedImage(ad.image as string);
      if (!img) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * ad.opacity));
      ctx.translate(cx, cy);
      if (rot) ctx.rotate(rot);
      ctx.translate(ad.x * refScale, ad.y * refScale);
      if (ad.rotation) ctx.rotate((ad.rotation * Math.PI) / 180);
      if (ad.mirror) ctx.scale(-1, 1);
      const w = img.naturalWidth  * ad.scale * refScale;
      const h = img.naturalHeight * ad.scale * refScale;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  private drawBackground(view: ViewSettings): void {
    const { ctx, canvas } = this;
    const mode = view.backgroundMode ?? "transparent";

    if (mode === "color" || mode === "chroma") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = view.backgroundColor || (mode === "chroma" ? "#00FF00" : "#000000");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // transparente
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!this.transparent) {
        // No editor mostramos um fundo escuro para enxergar o avatar
        ctx.fillStyle = "#1f1818";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  private drawPlaceholder(expression: { name: string; color: string } | null = null): void {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;

    // ─── Placeholder colorido pela expressão ativa ───
    if (expression) {
      const r = Math.min(canvas.width, canvas.height) * 0.18;
      const color = expression.color || "#6c5ce7";
      ctx.save();

      // corpo
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.15, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.stroke();

      // "olhos" para dar carinha
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath(); ctx.arc(cx - r * 0.36, cy - r * 0.25, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r * 0.36, cy - r * 0.25, r * 0.12, 0, Math.PI * 2); ctx.fill();

      // nome da expressão
      ctx.fillStyle = "#f4ebe8";
      ctx.font = `700 ${Math.max(12, r * 0.3)}px 'Segoe UI', system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(expression.name, cx, cy + r * 1.5);
      ctx.restore();
      return;
    }

    // ─── Placeholder genérico (sem expressão) ───
    const r = Math.min(canvas.width, canvas.height) * 0.14;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3, r * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = "#27282c";
    ctx.fill();
    ctx.strokeStyle = "#583535";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.55, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "#a21837";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.3, r * 0.85, Math.PI, 0);
    ctx.fillStyle = "#a21837";
    ctx.fill();

    ctx.fillStyle = "#b8a8a4";
    ctx.font = `600 ${r * 0.3}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Nenhum PNGTuber carregado ainda", cx, cy + r * 2.1);
    ctx.restore();
  }
}