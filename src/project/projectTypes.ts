import type { ViewSettings } from "../view/viewTypes";
import { DEFAULT_VIEW_SETTINGS } from "../view/viewTypes";
import type { AvatarEffect } from "../effects/effectTypes";
import { DEFAULT_EFFECTS } from "../effects/effectTypes";

export interface AvatarImages {
  mouthClosed: string | null;
  mouthOpen:   string | null;
  blinkClosed: string | null;
  blinkOpen:   string | null;
}

export interface BlinkConfig {
  intervalMin: number;
  intervalMax: number;
  duration:    number;
}

export interface AudioConfig {
  threshold: number;
  smoothing: number;
  deviceId:  string | null;
}

export interface PNGTuberProject {
  id:               string;
  name:             string;
  version:          string;
  projectVersion:   number;        // ← versão do schema (migração)
  createdAt:        string;
  updatedAt:        string;
  images:           AvatarImages;
  blinkConfig:      BlinkConfig;
  audioConfig:      AudioConfig;
  useDefaultAvatar: boolean;
  view:             ViewSettings;  // ← NOVO
  effects:          AvatarEffect[];// ← NOVO
  canvasWidth:      number;
  canvasHeight:     number;
}

export const PROJECT_SCHEMA_VERSION = 2;

export function createEmptyProject(): PNGTuberProject {
  return {
    id:             crypto.randomUUID(),
    name:           "Novo Projeto",
    version:        "1",
    projectVersion: PROJECT_SCHEMA_VERSION,
    createdAt:      new Date().toISOString(),
    updatedAt:      new Date().toISOString(),
    images: {
      mouthClosed: null,
      mouthOpen:   null,
      blinkClosed: null,
      blinkOpen:   null,
    },
    blinkConfig:      { intervalMin: 3, intervalMax: 8, duration: 150 },
    audioConfig:      { threshold: 15, smoothing: 0.8, deviceId: null },
    useDefaultAvatar: true,
    view:             { ...DEFAULT_VIEW_SETTINGS, filters: { ...DEFAULT_VIEW_SETTINGS.filters } },
    effects:          [...DEFAULT_EFFECTS],
    canvasWidth:      1280,
    canvasHeight:     720,
  };
}