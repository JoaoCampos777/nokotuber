type HotkeyCallback = (event: KeyboardEvent) => void;

interface HotkeyBinding {
  key: string;           // ex: "F1", "ctrl+shift+p"
  callback: HotkeyCallback;
  description: string;
}

const bindings: Map<string, HotkeyBinding> = new Map();

function normalizeKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("ctrl");
  if (event.shiftKey) parts.push("shift");
  if (event.altKey) parts.push("alt");
  parts.push(event.key.toLowerCase());
  return parts.join("+");
}

/**
 * Registra um atalho de teclado global.
 */
export function registerHotkey(
  key: string,
  callback: HotkeyCallback,
  description: string = ""
): void {
  bindings.set(key.toLowerCase(), { key, callback, description });
}

/**
 * Remove um atalho de teclado.
 */
export function unregisterHotkey(key: string): void {
  bindings.delete(key.toLowerCase());
}

/**
 * Lista todos os atalhos registrados (para UI de ajuda).
 */
export function listHotkeys(): HotkeyBinding[] {
  return Array.from(bindings.values());
}

/**
 * Inicializa o listener global de teclado.
 * Chamar uma vez no App.svelte.
 */
export function initHotkeyManager(): () => void {
  const handler = (e: KeyboardEvent) => {
    const key = normalizeKey(e);
    const binding = bindings.get(key);
    if (binding) {
      e.preventDefault();
      binding.callback(e);
    }
  };

  window.addEventListener("keydown", handler);

  // Retorna cleanup
  return () => window.removeEventListener("keydown", handler);
}