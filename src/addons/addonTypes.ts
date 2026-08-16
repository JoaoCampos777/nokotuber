/**
 * Add-on / acessório sobreposto ao personagem (óculos, chapéu, máscara, overlay…).
 * Fica associado a um avatar (Solo ou participante da Sala) e é desenhado como
 * uma camada dentro da transformação do avatar, então acompanha posição/escala.
 *
 * Offsets x/y são em px lógicos (mesmo espaço 1920x1080 da cena); a escala é
 * relativa ao tamanho natural da imagem. zIndex ordena os add-ons entre si —
 * negativo desenha ATRÁS do personagem (ex.: asas/aura), positivo À FRENTE.
 */
export interface Addon {
  id: string;
  name: string;
  image: string | null;   // data URL (ou ref asset:<hash> no snapshot)
  visible: boolean;
  x: number;
  y: number;
  scale: number;          // 1 = tamanho natural
  rotation: number;       // graus
  opacity: number;        // 0..1
  mirror: boolean;
  zIndex: number;         // <0 atrás do avatar, >=0 à frente
  // ─── Preparação para add-ons pagos (sem pagamento agora) ───
  source: "built-in" | "local" | "marketplace";
  productId?: string;
  author?: string;
  version?: string;
}

export function defaultAddon(name = "Acessório"): Addon {
  return {
    id: `addon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    image: null,
    visible: true,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    mirror: false,
    zIndex: 1,
    source: "local",
  };
}

/** Normaliza um add-on possivelmente parcial/antigo (defaults seguros). */
export function normalizeAddon(raw: any): Addon {
  const base = defaultAddon();
  if (!raw || typeof raw !== "object") return base;
  const num = (v: any, d: number) => (typeof v === "number" && !isNaN(v) ? v : d);
  const src = ["built-in", "local", "marketplace"].includes(raw.source) ? raw.source : "local";
  return {
    id: typeof raw.id === "string" ? raw.id : base.id,
    name: typeof raw.name === "string" ? raw.name : base.name,
    image: typeof raw.image === "string" ? raw.image : null,
    visible: raw.visible !== undefined ? !!raw.visible : true,
    x: num(raw.x, 0),
    y: num(raw.y, 0),
    scale: Math.max(0.05, num(raw.scale, 1)),
    rotation: num(raw.rotation, 0),
    opacity: Math.max(0, Math.min(1, num(raw.opacity, 1))),
    mirror: !!raw.mirror,
    zIndex: num(raw.zIndex, 1),
    source: src as Addon["source"],
    productId: typeof raw.productId === "string" ? raw.productId : undefined,
    author: typeof raw.author === "string" ? raw.author : undefined,
    version: typeof raw.version === "string" ? raw.version : undefined,
  };
}

export function normalizeAddons(raw: any): Addon[] {
  return Array.isArray(raw) ? raw.map(normalizeAddon) : [];
}
