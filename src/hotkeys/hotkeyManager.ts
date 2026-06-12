import { get } from "svelte/store";
import { expressionState, setActiveExpression } from "../project/expressionStore";

type HotkeyCallback = (event: KeyboardEvent) => void;

interface HotkeyBinding {
  key: string;           // ex: "F1", "ctrl+shift+p"
  callback: HotkeyCallback;
  description: string;
}

const bindings: Map<string, HotkeyBinding> = new Map();

/** Pausa a captura enquanto o usuário grava uma nova hotkey na UI. */
let capturing = false;
export function setHotkeyCapturing(v: boolean): void { capturing = v; }

function normalizeKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey)  parts.push("ctrl");
  if (event.shiftKey) parts.push("shift");
  if (event.altKey)   parts.push("alt");
  parts.push(event.key.toLowerCase());
  return parts.join("+");
}

/** Ignora atalhos enquanto o usuário digita em campos de texto. */
function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

/** Registra um atalho genérico do app (Salvar, Abrir, etc.). */
export function registerHotkey(
  key: string,
  callback: HotkeyCallback,
  description: string = "",
): void {
  bindings.set(key.toLowerCase(), { key, callback, description });
}

/** Remove um atalho genérico. */
export function unregisterHotkey(key: string): void {
  bindings.delete(key.toLowerCase());
}

/** Lista os atalhos genéricos registrados (para UI de ajuda). */
export function listHotkeys(): HotkeyBinding[] {
  return Array.from(bindings.values());
}

/** Tenta trocar de expressão pela tecla física (event.code). Retorna true se tratou. */
function tryExpressionHotkey(e: KeyboardEvent): boolean {
  const state = get(expressionState);
  const set = state.sets.find((s) => s.id === state.activeSetId);
  if (!set) return false;
  const match = set.expressions.find((ex) => ex.hotkey === e.code);
  if (match) { setActiveExpression(match.id); return true; }
  return false;
}

/**
 * Inicializa o listener global de teclado. Chamar uma vez (no Editor).
 * Ordem: expressões (por código físico) → atalhos genéricos (por tecla normalizada).
 */
export function initHotkeyManager(): () => void {
  const handler = (e: KeyboardEvent) => {
    if (capturing) return;
    if (isTypingTarget(e.target)) return;

    // 1) Troca de expressão — apenas teclas "puras" (sem ctrl/alt/meta)
    if (!e.ctrlKey && !e.metaKey && !e.altKey && tryExpressionHotkey(e)) {
      e.preventDefault();
      return;
    }

    // 2) Atalhos genéricos do app
    const binding = bindings.get(normalizeKey(e));
    if (binding) {
      e.preventDefault();
      binding.callback(e);
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}

/** Alias de compatibilidade. */
export const startHotkeyManager = initHotkeyManager;