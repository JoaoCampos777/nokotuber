import { writable } from "svelte/store";

// Preferências de interface (persistidas). Não afeta lógica do app —
// só controla o que é mostrado (Modo Simples esconde o avançado).
export type UiMode = "simple" | "advanced";
export interface UiPrefs { mode: UiMode; }

const KEY = "nokotuber:uiPrefs:v1";

function load(): UiPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.mode === "simple" || p?.mode === "advanced") return { mode: p.mode };
    }
  } catch {}
  return { mode: "simple" }; // usuários novos começam no modo simples
}

export const uiPrefs = writable<UiPrefs>(load());
uiPrefs.subscribe((p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} });

export function setUiMode(mode: UiMode): void { uiPrefs.update((p) => ({ ...p, mode })); }
export function toggleUiMode(): void {
  uiPrefs.update((p) => ({ ...p, mode: p.mode === "simple" ? "advanced" : "simple" }));
}
