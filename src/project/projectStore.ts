import { writable } from "svelte/store";
import type { PNGTuberProject, AvatarImages, BlinkConfig, AudioConfig } from "./projectTypes";
import { createEmptyProject } from "./projectTypes";
import { migrateProject } from "./migrateProject";
import type { ViewSettings, ViewFilters } from "../view/viewTypes";
import type { AvatarEffect, EffectParams } from "../effects/effectTypes";
import type { Addon } from "../addons/addonTypes";
import { defaultAddon } from "../addons/addonTypes";
import type { MouthConfig, Viseme } from "../mouth/mouthTypes";

export type ImageSlot = keyof AvatarImages;

export const project            = writable<PNGTuberProject>(createEmptyProject());
export const isDirty            = writable<boolean>(false);
export const currentProjectPath = writable<string | null>(null);

// ─── Imagens ─────────────────────────────────────────────
export function setImage(slot: ImageSlot, dataUrl: string): void {
  project.update((p) => ({ ...p, images: { ...p.images, [slot]: dataUrl }, updatedAt: now() }));
  isDirty.set(true);
}
export function clearImage(slot: ImageSlot): void {
  project.update((p) => ({ ...p, images: { ...p.images, [slot]: null }, updatedAt: now() }));
  isDirty.set(true);
}

// ─── Configs ─────────────────────────────────────────────
export function updateBlinkConfig(patch: Partial<BlinkConfig>): void {
  project.update((p) => ({ ...p, blinkConfig: { ...p.blinkConfig, ...patch }, updatedAt: now() }));
  isDirty.set(true);
}
export function updateAudioConfig(patch: Partial<AudioConfig>): void {
  project.update((p) => ({ ...p, audioConfig: { ...p.audioConfig, ...patch }, updatedAt: now() }));
  isDirty.set(true);
}
export function toggleDefaultAvatar(): void {
  project.update((p) => ({ ...p, useDefaultAvatar: !p.useDefaultAvatar, updatedAt: now() }));
  isDirty.set(true);
}

// ─── View ────────────────────────────────────────────────
export function updateView(patch: Partial<ViewSettings>): void {
  project.update((p) => ({ ...p, view: { ...p.view, ...patch }, updatedAt: now() }));
  isDirty.set(true);
}
export function updateViewFilters(patch: Partial<ViewFilters>): void {
  project.update((p) => ({ ...p, view: { ...p.view, filters: { ...p.view.filters, ...patch } }, updatedAt: now() }));
  isDirty.set(true);
}

// ─── Effects (CRUD) ──────────────────────────────────────
export function addEffect(effect: AvatarEffect): void {
  project.update((p) => ({ ...p, effects: [...p.effects, effect], updatedAt: now() }));
  isDirty.set(true);
}
export function removeEffect(id: string): void {
  project.update((p) => ({ ...p, effects: p.effects.filter((e) => e.id !== id), updatedAt: now() }));
  isDirty.set(true);
}
export function updateEffect(id: string, patch: Partial<AvatarEffect>): void {
  project.update((p) => ({
    ...p,
    effects: p.effects.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    updatedAt: now(),
  }));
  isDirty.set(true);
}
export function updateEffectParams(id: string, patch: Partial<EffectParams>): void {
  project.update((p) => ({
    ...p,
    effects: p.effects.map((e) => (e.id === id ? { ...e, params: { ...e.params, ...patch } } : e)),
    updatedAt: now(),
  }));
  isDirty.set(true);
}
export function toggleEffect(id: string): void {
  project.update((p) => ({
    ...p,
    effects: p.effects.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
    updatedAt: now(),
  }));
  isDirty.set(true);
}
export function duplicateEffect(id: string): void {
  project.update((p) => {
    const src = p.effects.find((e) => e.id === id);
    if (!src) return p;
    const copy: AvatarEffect = {
      ...src,
      id: `effect_${src.type}_${crypto.randomUUID().slice(0, 8)}`,
      name: `${src.name} (cópia)`,
      params: { ...src.params },
    };
    const idx = p.effects.findIndex((e) => e.id === id);
    const arr = [...p.effects];
    arr.splice(idx + 1, 0, copy);
    return { ...p, effects: arr, updatedAt: now() };
  });
  isDirty.set(true);
}

// ─── Add-ons (Fase 3) ────────────────────────────────────
export function addProjectAddon(): string {
  const ad = defaultAddon();
  project.update((p) => ({ ...p, addons: [...(p.addons ?? []), ad], updatedAt: now() }));
  isDirty.set(true);
  return ad.id;
}
export function removeProjectAddon(id: string): void {
  project.update((p) => ({ ...p, addons: (p.addons ?? []).filter((a) => a.id !== id), updatedAt: now() }));
  isDirty.set(true);
}
export function updateProjectAddon(id: string, patch: Partial<Addon>): void {
  project.update((p) => ({ ...p, addons: (p.addons ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)), updatedAt: now() }));
  isDirty.set(true);
}

// ─── Boca / visemas (Fase 5/6) ───────────────────────────
export function updateMouth(patch: Partial<MouthConfig>): void {
  project.update((p) => ({ ...p, mouth: { ...p.mouth, ...patch }, updatedAt: now() }));
  isDirty.set(true);
}
export function setVisemeImage(v: Viseme, url: string): void {
  project.update((p) => ({ ...p, mouth: { ...p.mouth, visemes: { ...p.mouth.visemes, [v]: url } }, updatedAt: now() }));
  isDirty.set(true);
}
export function clearVisemeImage(v: Viseme): void {
  project.update((p) => ({ ...p, mouth: { ...p.mouth, visemes: { ...p.mouth.visemes, [v]: null } }, updatedAt: now() }));
  isDirty.set(true);
}
/** Seletor manual/preview: NÃO marca dirty (é estado de exibição). */
export function setManualViseme(v: Viseme): void {
  project.update((p) => ({ ...p, mouth: { ...p.mouth, manualViseme: v } }));
}

// ─── Projeto ─────────────────────────────────────────────
export function newProject(): void {
  project.set(createEmptyProject());
  currentProjectPath.set(null);
  isDirty.set(false);
}

export function loadProject(content: string, path: string): void {
  let data: any;
  try { data = JSON.parse(content); }
  catch { throw new Error("Arquivo inválido: não é um JSON válido."); }
  if (!data || typeof data !== "object") throw new Error("Arquivo inválido: estrutura desconhecida.");
  if (!data.images) throw new Error("Arquivo inválido: faltam dados de imagens.");

  const migrated = migrateProject(data);  // ← migração + validação
  migrated.updatedAt = now();
  project.set(migrated);
  currentProjectPath.set(path);
  isDirty.set(false);
}

// ─── Sync para a janela de performance (sem marcar dirty) ─
export function applyConfigSync(cfg: {
  view: ViewSettings; effects: AvatarEffect[];
  blinkConfig: BlinkConfig; audioConfig: AudioConfig; useDefaultAvatar: boolean;
  addons?: Addon[]; mouth?: MouthConfig;
}): void {
  project.update((p) => ({
    ...p,
    view: cfg.view, effects: cfg.effects,
    blinkConfig: cfg.blinkConfig, audioConfig: cfg.audioConfig,
    useDefaultAvatar: cfg.useDefaultAvatar,
    addons: Array.isArray(cfg.addons) ? cfg.addons : p.addons,
    mouth: cfg.mouth ?? p.mouth,
  }));
}
export function applyImagesSync(images: AvatarImages): void {
  project.update((p) => ({ ...p, images: { ...p.images, ...images } }));
}

function now(): string { return new Date().toISOString(); }