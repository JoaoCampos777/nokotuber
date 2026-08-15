import { writable, get } from "svelte/store";

/**
 * Preferência de início do Nokotuber (Feature D).
 *   - "home":     não abre nenhum personagem automaticamente (comportamento atual).
 *   - "last":     reabre o último personagem aplicado.
 *   - "specific": abre sempre um personagem escolhido (o "personagem padrão").
 * `lastCharacterId` é atualizado toda vez que um personagem é aplicado.
 */
export type StartupMode = "home" | "last" | "specific";

export interface StartupPrefs {
  mode: StartupMode;
  characterId: string | null;      // usado quando mode === "specific"
  lastCharacterId: string | null;  // atualizado a cada applyCharacter
}

const KEY = "nokotuber:startup:v1";

function defaults(): StartupPrefs {
  return { mode: "home", characterId: null, lastCharacterId: null };
}

/** Janela de performance/companion não deve escrever preferências do Editor. */
function isSecondaryWindow(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const s = (window.location.search || "") + (window.location.hash || "");
    if (s.includes("performance") || s.includes("mode=companion") || s.includes("view=companion-stage")) return true;
    const label = (window as any)?.__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
    return label === "performance" || label === "companion" || label === "companion-stage";
  } catch { return false; }
}

function load(): StartupPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const mode: StartupMode = p?.mode === "last" || p?.mode === "specific" ? p.mode : "home";
      return {
        mode,
        characterId: typeof p?.characterId === "string" ? p.characterId : null,
        lastCharacterId: typeof p?.lastCharacterId === "string" ? p.lastCharacterId : null,
      };
    }
  } catch {}
  return defaults();
}

export const startupPrefs = writable<StartupPrefs>(load());

if (!isSecondaryWindow()) {
  startupPrefs.subscribe((p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} });
}

export function setStartupMode(mode: StartupMode): void {
  startupPrefs.update((p) => ({ ...p, mode }));
}

/** Define um personagem como "padrão" (mode=specific + id). */
export function setDefaultCharacter(id: string): void {
  startupPrefs.update((p) => ({ ...p, mode: "specific", characterId: id }));
}

/** Remove o padrão e volta para "tela inicial". */
export function clearDefaultCharacter(): void {
  startupPrefs.update((p) => ({ ...p, mode: "home", characterId: null }));
}

/** Registra o último personagem aplicado (para o modo "last"). */
export function setLastCharacter(id: string): void {
  startupPrefs.update((p) => ({ ...p, lastCharacterId: id }));
}

/**
 * Se um personagem removido era o padrão/último, limpa as referências para
 * não apontar para algo inexistente.
 */
export function forgetCharacter(id: string): void {
  startupPrefs.update((p) => ({
    ...p,
    characterId: p.characterId === id ? null : p.characterId,
    mode: p.characterId === id && p.mode === "specific" ? "home" : p.mode,
    lastCharacterId: p.lastCharacterId === id ? null : p.lastCharacterId,
  }));
}

/** Qual personagem deve ser carregado ao iniciar (ou null). */
export function resolveStartupCharacterId(): string | null {
  const p = get(startupPrefs);
  if (p.mode === "specific") return p.characterId;
  if (p.mode === "last") return p.lastCharacterId;
  return null;
}
