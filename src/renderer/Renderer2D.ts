import type { ViewSettings } from "../view/viewTypes";
import type { AvatarEffect } from "../effects/effectTypes";
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
      if (!this.targetUrl) this.drawPlaceholder();
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
    const scaleX    = baseScale * sizeMul * fx.scaleX;
    const scaleY    = baseScale * sizeMul * fx.scaleY;

    const w = img.naturalWidth  * scaleX;
    const h = img.naturalHeight * scaleY;

    // ─── Posição ───
    const cx = canvas.width  / 2 + (view.positionX ?? 0) + fx.x;
    const cy = canvas.height / 2 + (view.positionY ?? 0) + fx.y;

    // ─── Filtros (hue/sat/bri) + brilho do efeito ───
    const f        = view.filters ?? DEFAULT_VIEW_SETTINGS.filters;
    const briTotal = Math.max(0, f.brightness * fx.brightness);

    ctx.save();
    ctx.filter = `hue-rotate(${f.hue}deg) saturate(${f.saturation}) brightness(${briTotal})`;
    ctx.globalAlpha = fx.alpha;
    ctx.translate(cx, cy);
    if (fx.rotation) ctx.rotate(fx.rotation);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
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

  private drawPlaceholder(): void {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const r  = Math.min(canvas.width, canvas.height) * 0.14;

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