import { writable } from "svelte/store";

export const companionMode = writable(false);
export function enterCompanionMode(): void { companionMode.set(true); }
export function exitCompanionMode(): void { companionMode.set(false); }

const TUT_KEY = "nokotuber:companionTutorialDismissed:v1";
export const tutorialOpen = writable(false);
export function openTutorial(): void { tutorialOpen.set(true); }
export function closeTutorial(): void { tutorialOpen.set(false); }
export function tutorialDismissed(): boolean { try { return localStorage.getItem(TUT_KEY) === "1"; } catch { return false; } }
export function dismissTutorialForever(): void { try { localStorage.setItem(TUT_KEY, "1"); } catch {} tutorialOpen.set(false); }
export function resetTutorial(): void { try { localStorage.removeItem(TUT_KEY); } catch {} tutorialOpen.set(true); }