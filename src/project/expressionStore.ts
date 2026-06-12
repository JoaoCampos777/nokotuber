import { writable, derived, get } from "svelte/store";
import type { ExpressionSet, Expression, ExpressionProjectState, ExpressionSlot, ExpressionImageSlot } from "./expressionTypes";
import { emptyExpressionImages } from "./expressionTypes";

const STORAGE_KEY = "nokotuber:expressions:v1";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const PALETTE: Record<string, string> = {
  neutral: "#6c5ce7",
  sad:     "#2d4a8c",
  angry:   "#c0392b",
  happy:   "#f1c40f",
  talking: "#a21837",
  special: "#16a085",
};

function makeExpression(
  name: string,
  slot: ExpressionSlot,
  hotkey: string | null,
  color: string,
): Expression {
  return { id: uid("exp"), name, slot, hotkey, images: emptyExpressionImages(), fallbackColor: color, isActive: false };
}

function defaultState(): ExpressionProjectState {
  const setId = uid("set");
  const exps: Expression[] = [
    makeExpression("Neutro", "neutral", "Digit1", PALETTE.neutral),
    makeExpression("Triste", "sad",     "Digit2", PALETTE.sad),
    makeExpression("Bravo",  "angry",   "Digit3", PALETTE.angry),
    makeExpression("Feliz",  "happy",   "Digit4", PALETTE.happy),
  ];
  return {
    projectName: "Novo Projeto",
    sets: [{ id: setId, name: "Normal", isActive: true, expressions: exps }],
    activeSetId: setId,
    activeExpressionId: exps[0].id,
  };
}

/** Sincroniza os booleanos isActive com base no activeSetId / activeExpressionId. */
function normalize(state: ExpressionProjectState): ExpressionProjectState {
  for (const set of state.sets) {
    set.isActive = set.id === state.activeSetId;
    for (const ex of set.expressions) {
      if (!ex.images) ex.images = emptyExpressionImages();   // migração de estados antigos
      ex.isActive = set.isActive && ex.id === state.activeExpressionId;
    }
  }
  return state;
}


// ─── Store principal ──────────────────────────────────────
export const expressionState = writable<ExpressionProjectState>(normalize(defaultState()));

/** Detecta se este código roda na janela de performance (não deve auto-salvar). */
function isPerformanceWindow(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.location.search.includes("performance")) return true;
    if (window.location.hash.includes("performance"))   return true;
    const label = (window as any)?.__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
    return label === "performance";
  } catch { return false; }
}

// Hidrata do localStorage ao iniciar (as duas janelas leem o último estado salvo)
loadProjectFromLocalStorage();

// Auto-salva apenas na janela do Editor — evita a janela de performance
// (que ainda não está sincronizada) sobrescrever o que você editou.
if (!isPerformanceWindow()) {
  expressionState.subscribe((s) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  });
}

// ─── Derivados ────────────────────────────────────────────
export const activeSet = derived(expressionState, ($s) =>
  $s.sets.find((set) => set.id === $s.activeSetId) ?? $s.sets[0] ?? null
);

export const activeExpression = derived(expressionState, ($s) => {
  const set = $s.sets.find((x) => x.id === $s.activeSetId);
  if (!set) return null;
  return set.expressions.find((e) => e.id === $s.activeExpressionId) ?? set.expressions[0] ?? null;
});

/** Ids de expressões que têm hotkey duplicada DENTRO do mesmo set (conflito). */
export const hotkeyConflicts = derived(expressionState, ($s) => {
  const conflicts = new Set<string>();
  for (const set of $s.sets) {
    const byKey = new Map<string, string[]>();
    for (const ex of set.expressions) {
      if (!ex.hotkey) continue;
      const arr = byKey.get(ex.hotkey) ?? [];
      arr.push(ex.id);
      byKey.set(ex.hotkey, arr);
    }
    for (const ids of byKey.values()) {
      if (ids.length > 1) ids.forEach((id) => conflicts.add(id));
    }
  }
  return conflicts;
});

// ─── Ações: Sets ──────────────────────────────────────────
export function createSet(name = "Nova aba"): string {
  const id = uid("set");
  expressionState.update((s) => {
    const exps = [
      makeExpression("Neutro",  "neutral", "Digit1", PALETTE.neutral),
      makeExpression("Falando", "talking", "Digit2", PALETTE.talking),
    ];
    s.sets.push({ id, name, isActive: false, expressions: exps });
    s.activeSetId = id;
    s.activeExpressionId = exps[0].id;
    return normalize(s);
  });
  return id;
}

export function renameSet(id: string, name: string): void {
  expressionState.update((s) => {
    const set = s.sets.find((x) => x.id === id);
    if (set) set.name = name;
    return s;
  });
}

export function removeSet(id: string): void {
  expressionState.update((s) => {
    if (s.sets.length <= 1) return s; // sempre manter pelo menos uma aba
    s.sets = s.sets.filter((x) => x.id !== id);
    if (s.activeSetId === id) {
      const first = s.sets[0];
      s.activeSetId = first.id;
      s.activeExpressionId = first.expressions[0]?.id ?? null;
    }
    return normalize(s);
  });
}

export function setActiveSet(id: string): void {
  expressionState.update((s) => {
    const set = s.sets.find((x) => x.id === id);
    if (!set) return s;
    s.activeSetId = id;
    s.activeExpressionId = set.expressions[0]?.id ?? null;
    return normalize(s);
  });
}

// ─── Ações: Expressões ────────────────────────────────────
export function setActiveExpression(id: string): void {
  expressionState.update((s) => {
    s.activeExpressionId = id;
    return normalize(s);
  });
}

export function addExpression(setId: string, name = "Nova expressão"): string {
  const id = uid("exp");
  expressionState.update((s) => {
    const set = s.sets.find((x) => x.id === setId);
    if (set) set.expressions.push(makeExpression(name, "neutral", null, PALETTE.neutral));
    return s;
  });
  return id;
}

export function removeExpression(setId: string, expId: string): void {
  expressionState.update((s) => {
    const set = s.sets.find((x) => x.id === setId);
    if (!set || set.expressions.length <= 1) return s;
    set.expressions = set.expressions.filter((e) => e.id !== expId);
    if (s.activeExpressionId === expId) s.activeExpressionId = set.expressions[0]?.id ?? null;
    return normalize(s);
  });
}

export function renameExpression(expId: string, name: string): void {
  expressionState.update((s) => {
    for (const set of s.sets) {
      const ex = set.expressions.find((e) => e.id === expId);
      if (ex) { ex.name = name; break; }
    }
    return s;
  });
}

export function updateExpressionHotkey(expId: string, hotkey: string | null): void {
  expressionState.update((s) => {
    for (const set of s.sets) {
      const ex = set.expressions.find((e) => e.id === expId);
      if (ex) { ex.hotkey = hotkey; break; }
    }
    return s;
  });
}

export function setExpressionImage(expId: string, slot: ExpressionImageSlot, url: string): void {
  expressionState.update((s) => {
    for (const set of s.sets) {
      const ex = set.expressions.find((e) => e.id === expId);
      if (ex) { ex.images = { ...ex.images, [slot]: url }; break; }
    }
    return s;
  });
}

export function clearExpressionImage(expId: string, slot: ExpressionImageSlot): void {
  expressionState.update((s) => {
    for (const set of s.sets) {
      const ex = set.expressions.find((e) => e.id === expId);
      if (ex) { ex.images = { ...ex.images, [slot]: null }; break; }
    }
    return s;
  });
}

// ─── Persistência ─────────────────────────────────────────
export function saveProjectToLocalStorage(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(get(expressionState))); } catch {}
}

export function loadProjectFromLocalStorage(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as ExpressionProjectState;
    if (!parsed?.sets?.length) return false;
    expressionState.set(normalize(parsed));
    return true;
  } catch { return false; }
}

export function resetProjectState(): void {
  expressionState.set(normalize(defaultState()));
}

/** Aplica as expressões vindas de um projeto carregado (.noko). */
export function applyExpressions(raw: any): void {
  if (raw && Array.isArray(raw.sets) && raw.sets.length) expressionState.set(normalize(raw));
  else resetProjectState();
}
