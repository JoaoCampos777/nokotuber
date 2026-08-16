/**
 * Boca por visemas (Fase 5/6). Modo "simple" (boca fechada/aberta) continua o
 * PADRÃO — visemas são um modo OPCIONAL. Conjunto compacto REST/A/E/I/O/U.
 *
 * Dois tipos de avatar no modo visemas:
 *  - "full": cada viseme é a imagem INTEIRA do personagem (troca completa).
 *  - "separated": o personagem tem uma base e a boca é uma CAMADA sobre ela
 *    (as imagens de viseme contêm só a boca; reaproveita o conceito de layer
 *    dos add-ons), posicionada por `transform`.
 *
 * Nesta fase o viseme exibido é MANUAL (`manualViseme`) — seletor/preview para
 * validar as imagens. Reconhecimento automático de vogal fica experimental/futuro
 * (volume NÃO identifica fonema — ver VISEMES.md).
 */
export type Viseme = "rest" | "a" | "e" | "i" | "o" | "u";
export const VISEMES: Viseme[] = ["rest", "a", "e", "i", "o", "u"];
export const VISEME_LABELS: Record<Viseme, string> = {
  rest: "Neutra", a: "A", e: "E", i: "I", o: "O", u: "U",
};

export type MouthMode = "simple" | "visemes";
export type MouthAvatarKind = "full" | "separated";

export type VisemeImages = Record<Viseme, string | null>;

export interface MouthTransform { x: number; y: number; scale: number; rotation: number; }

export interface MouthConfig {
  mode: MouthMode;             // "simple" (padrão) | "visemes"
  kind: MouthAvatarKind;       // "full" (imagens completas) | "separated" (base + boca)
  visemes: VisemeImages;       // imagens por viseme
  manualViseme: Viseme;        // viseme atual (seletor manual / preview). Padrão "rest"
  transform: MouthTransform;   // posição da boca (modo "separated")
}

export function emptyVisemeImages(): VisemeImages {
  return { rest: null, a: null, e: null, i: null, o: null, u: null };
}

export function defaultMouthConfig(): MouthConfig {
  return {
    mode: "simple",
    kind: "full",
    visemes: emptyVisemeImages(),
    manualViseme: "rest",
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  };
}

/** Normaliza (tolerante a ausência/parcial → default "simple", compat projetos antigos). */
export function normalizeMouthConfig(raw: any): MouthConfig {
  const base = defaultMouthConfig();
  if (!raw || typeof raw !== "object") return base;
  const num = (v: any, d: number) => (typeof v === "number" && !isNaN(v) ? v : d);
  const visemes: VisemeImages = emptyVisemeImages();
  for (const v of VISEMES) {
    const img = raw?.visemes?.[v];
    if (typeof img === "string") visemes[v] = img;
  }
  const mv: Viseme = VISEMES.includes(raw.manualViseme) ? raw.manualViseme : "rest";
  const t = raw.transform ?? {};
  return {
    mode: raw.mode === "visemes" ? "visemes" : "simple",
    kind: raw.kind === "separated" ? "separated" : "full",
    visemes,
    manualViseme: mv,
    transform: {
      x: num(t.x, 0), y: num(t.y, 0),
      scale: Math.max(0.05, num(t.scale, 1)), rotation: num(t.rotation, 0),
    },
  };
}
