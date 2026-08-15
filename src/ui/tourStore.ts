import { writable, get } from "svelte/store";

export interface TourStep {
  /** id do elemento-alvo (data-tour="..."). Ausente = passo centralizado, sem destaque. */
  target?: string;
  title: string;
  body: string;
}
export interface Tour { id: string; name: string; desc: string; steps: TourStep[]; }

const SEEN_KEY = "nokotuber:tourSeen:v1";

export const activeTour = writable<Tour | null>(null);
export const tourIndex = writable(0);
export const tourMenuOpen = writable(false);

export function startTour(t: Tour): void { tourIndex.set(0); activeTour.set(t); tourMenuOpen.set(false); }
export function nextStep(): void {
  const t = get(activeTour); if (!t) return;
  const i = get(tourIndex);
  if (i < t.steps.length - 1) tourIndex.set(i + 1);
  else endTour();
}
export function prevStep(): void { const i = get(tourIndex); if (i > 0) tourIndex.set(i - 1); }
/** Encerra o tour. Sempre marca como visto (não reabre sozinho; use o botão Tutorial). */
export function endTour(): void { activeTour.set(null); markTourSeen(); }
export function openTourMenu(): void { tourMenuOpen.set(true); }
export function closeTourMenu(): void { tourMenuOpen.set(false); }

export function tourSeen(): boolean { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; } }
export function markTourSeen(): void { try { localStorage.setItem(SEEN_KEY, "1"); } catch {} }
