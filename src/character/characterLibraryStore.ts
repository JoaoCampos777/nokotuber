import { writable, get } from "svelte/store";
import type { Character } from "./characterTypes";
import { CHARACTER_SCHEMA_VERSION, CHARACTER_FILE_EXT, isCharacter } from "./characterTypes";
import { project, isDirty } from "../project/projectStore";
import { createEmptyProject } from "../project/projectTypes";
import { expressionState, applyExpressions } from "../project/expressionStore";
import { voiceReactionRule, audioThreshold } from "../audio/audioStore";
import { defaultReactionRule } from "../audio/voiceReactionTypes";
import { normalizeAddons } from "../addons/addonTypes";
import { setLastCharacter, forgetCharacter } from "./startupPrefsStore";
import { saveTextFileAs, openTextFile } from "../core/desktop";

/**
 * Biblioteca de personagens reutilizáveis (Feature B). Cada personagem é um
 * pacote independente do projeto. As operações apenas EXTRAEM do estado atual
 * (Solo) e INJETAM de volta nos stores existentes — sem duplicar lógica.
 */

const KEY = "nokotuber:characters:v1";

function uid(): string {
  return `char_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function nowIso(): string { return new Date().toISOString(); }
/** Clone seguro (tudo aqui é serializável: strings/data-urls/numbers). */
function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

function isSecondaryWindow(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const s = (window.location.search || "") + (window.location.hash || "");
    if (s.includes("performance") || s.includes("mode=companion") || s.includes("view=companion-stage")) return true;
    const label = (window as any)?.__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
    return label === "performance" || label === "companion" || label === "companion-stage";
  } catch { return false; }
}

/** Preenche campos ausentes de um personagem (import parcial / versão antiga). */
function normalizeCharacter(raw: any): Character {
  const base = createEmptyProject();
  const now = nowIso();
  const exprOk = raw?.expressions && Array.isArray(raw.expressions.sets) && raw.expressions.sets.length;
  return {
    id: typeof raw?.id === "string" ? raw.id : uid(),
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name : "Personagem",
    characterVersion: CHARACTER_SCHEMA_VERSION,
    createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : now,
    images: { ...base.images, ...(raw?.images ?? {}) },
    blinkConfig: { ...base.blinkConfig, ...(raw?.blinkConfig ?? {}) },
    audioConfig: { ...base.audioConfig, ...(raw?.audioConfig ?? {}) },
    speechThreshold: typeof raw?.speechThreshold === "number" ? raw.speechThreshold : 15,
    view: { ...base.view, ...(raw?.view ?? {}), filters: { ...base.view.filters, ...(raw?.view?.filters ?? {}) } },
    effects: Array.isArray(raw?.effects) ? raw.effects : [],
    useDefaultAvatar: typeof raw?.useDefaultAvatar === "boolean" ? raw.useDefaultAvatar : base.useDefaultAvatar,
    expressions: exprOk ? raw.expressions : { projectName: raw?.name ?? "Personagem", sets: [], activeSetId: null, activeExpressionId: null },
    voiceReaction: raw?.voiceReaction && typeof raw.voiceReaction === "object"
      ? { ...defaultReactionRule(), ...raw.voiceReaction }
      : defaultReactionRule(),
    addons: normalizeAddons(raw?.addons),
    mouth: raw?.mouth ?? undefined,
    meta: raw?.meta && typeof raw.meta === "object" ? raw.meta : { source: "local" },
  };
}

function load(): Character[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter(isCharacter).map(normalizeCharacter);
    }
  } catch {}
  return [];
}

export const characters = writable<Character[]>(load());

if (!isSecondaryWindow()) {
  characters.subscribe((list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} });
}

// ─── Leitura ──────────────────────────────────────────────
export function getCharacter(id: string): Character | undefined {
  return get(characters).find((c) => c.id === id);
}

// ─── Captura do estado atual (Solo) → Character ───────────
export function captureCurrentCharacter(name: string): Character {
  const p = get(project);
  const now = nowIso();
  return {
    id: uid(),
    name: name.trim() || "Personagem",
    characterVersion: CHARACTER_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    images: clone(p.images),
    blinkConfig: clone(p.blinkConfig),
    audioConfig: clone(p.audioConfig),
    speechThreshold: get(audioThreshold),
    view: clone(p.view),
    effects: clone(p.effects),
    useDefaultAvatar: p.useDefaultAvatar,
    expressions: clone(get(expressionState)),
    voiceReaction: clone(get(voiceReactionRule)),
    addons: clone(p.addons ?? []),
    meta: { source: "local" },
  };
}

// ─── CRUD ─────────────────────────────────────────────────
/** Salva o avatar atual como um novo personagem. Retorna o id. */
export function saveCurrentAsCharacter(name: string): string {
  const c = captureCurrentCharacter(name);
  characters.update((list) => [...list, c]);
  return c.id;
}

/** Sobrescreve um personagem existente com o estado atual (mantém id/nome/criação). */
export function updateCharacterFromCurrent(id: string): boolean {
  const existing = getCharacter(id);
  if (!existing) return false;
  const snap = captureCurrentCharacter(existing.name);
  characters.update((list) => list.map((c) => (c.id === id
    ? { ...snap, id, name: existing.name, createdAt: existing.createdAt, updatedAt: nowIso() }
    : c)));
  return true;
}

export function renameCharacter(id: string, name: string): void {
  const clean = name.trim();
  if (!clean) return;
  characters.update((list) => list.map((c) => (c.id === id ? { ...c, name: clean, updatedAt: nowIso() } : c)));
}

export function deleteCharacter(id: string): void {
  characters.update((list) => list.filter((c) => c.id !== id));
  forgetCharacter(id);
}

/** Adiciona um personagem já pronto (import) — gera novo id se colidir. */
export function addCharacter(raw: any): Character {
  let c = normalizeCharacter(raw);
  if (get(characters).some((x) => x.id === c.id)) c = { ...c, id: uid() };
  characters.update((list) => [...list, c]);
  return c;
}

// ─── Aplicar Character → estado atual (Solo) ──────────────
/**
 * Injeta um personagem nos stores vivos (projeto + expressões + reação + limiar).
 * `markDirty=false` no carregamento inicial para não marcar "não salvo" à toa.
 */
export function applyCharacter(id: string, opts?: { markDirty?: boolean }): boolean {
  const c = getCharacter(id);
  if (!c) return false;

  project.update((p) => ({
    ...p,
    images: clone(c.images),
    blinkConfig: clone(c.blinkConfig),
    audioConfig: clone(c.audioConfig),
    view: clone(c.view),
    effects: clone(c.effects),
    addons: clone(c.addons ?? []),
    useDefaultAvatar: c.useDefaultAvatar,
    updatedAt: nowIso(),
  }));
  audioThreshold.set(c.speechThreshold);
  applyExpressions(clone(c.expressions));
  voiceReactionRule.set(clone(c.voiceReaction));

  setLastCharacter(id);
  if (opts?.markDirty !== false) isDirty.set(true);
  return true;
}

// ─── Import / Export (.nokochar) ──────────────────────────
export async function exportCharacter(id: string): Promise<string | null> {
  const c = getCharacter(id);
  if (!c) return null;
  const safe = c.name.replace(/[^\w.-]+/g, "_") || "personagem";
  return saveTextFileAs(JSON.stringify(c, null, 2), `${safe}.${CHARACTER_FILE_EXT}`, "Nokotuber Character", [CHARACTER_FILE_EXT, "json"]);
}

/** Importa um .nokochar e adiciona à biblioteca. Retorna o personagem ou null. */
export async function importCharacter(): Promise<Character | null> {
  const r = await openTextFile("Nokotuber Character", [CHARACTER_FILE_EXT, "json"]);
  if (!r) return null;
  let raw: any;
  try { raw = JSON.parse(r.content); }
  catch { throw new Error("Arquivo inválido: não é um personagem Nokotuber."); }
  if (!isCharacter(raw)) throw new Error("Arquivo inválido: estrutura de personagem desconhecida.");
  return addCharacter(raw);
}
