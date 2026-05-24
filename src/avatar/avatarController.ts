import { writable, get } from "svelte/store";
import { isTalking } from "../audio/audioStore";
import { project } from "../project/projectStore";
import type { PNGTuberProject } from "../project/projectTypes";
import type { ImageSlot } from "../project/projectStore";
import { DEFAULT_AVATAR } from "../config/defaultAvatar";

export type AvatarState = "idle" | "talking" | "blink-idle" | "blink-talking";

export const avatarState     = writable<AvatarState>("idle");
export const currentImageUrl = writable<string | null>(null);
export const isBlinking      = writable<boolean>(false);

let blinkTimeout:    ReturnType<typeof setTimeout> | null = null;
let blinkEndTimeout: ReturnType<typeof setTimeout> | null = null;

// ─── helpers ─────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getNextBlinkDelay(): number {
  const { intervalMin, intervalMax } = get(project).blinkConfig;
  return randomBetween(intervalMin, intervalMax) * 1000;
}

/**
 * Resolve a URL de imagem para um slot, com fallback para o avatar padrão.
 */
function resolveSlot(slot: ImageSlot, p: PNGTuberProject): string | null {
  const userImg = p.images[slot];
  if (userImg) return userImg;
  if (p.useDefaultAvatar) return DEFAULT_AVATAR[slot];
  return null;
}

// ─── state machine ───────────────────────────────────────

export function updateCurrentImage(): void {
  const p       = get(project);
  const talking = get(isTalking);
  const blink   = get(isBlinking);

  const closed      = resolveSlot("mouthClosed", p);
  const open        = resolveSlot("mouthOpen",   p);
  const blinkClosed = resolveSlot("blinkClosed", p);
  const blinkOpen   = resolveSlot("blinkOpen",   p);

  let url:   string | null = null;
  let state: AvatarState   = "idle";

  if (blink && talking) {
    url   = blinkOpen ?? open ?? closed;
    state = "blink-talking";
  } else if (blink) {
    url   = blinkClosed ?? closed;
    state = "blink-idle";
  } else if (talking) {
    url   = open ?? closed;
    state = "talking";
  } else {
    url   = closed;
    state = "idle";
  }

  currentImageUrl.set(url);
  avatarState.set(state);
}

function triggerBlink(): void {
  const { duration } = get(project).blinkConfig;
  isBlinking.set(true);
  updateCurrentImage();

  if (blinkEndTimeout) clearTimeout(blinkEndTimeout);
  blinkEndTimeout = setTimeout(() => {
    isBlinking.set(false);
    updateCurrentImage();
    scheduleBlink();
  }, duration);
}

function scheduleBlink(): void {
  if (blinkTimeout) clearTimeout(blinkTimeout);
  blinkTimeout = setTimeout(triggerBlink, getNextBlinkDelay());
}

export function startAvatarController(): () => void {
  const unsubTalking = isTalking.subscribe(updateCurrentImage);
  const unsubProject = project.subscribe(updateCurrentImage);

  updateCurrentImage();
  scheduleBlink();

  return () => {
    unsubTalking();
    unsubProject();
    if (blinkTimeout)    clearTimeout(blinkTimeout);
    if (blinkEndTimeout) clearTimeout(blinkEndTimeout);
    isBlinking.set(false);
  };
}