export type SizeMode       = "auto" | "manual";
export type BackgroundMode = "transparent" | "color" | "chroma";

export interface ViewFilters {
  hue:        number;  // -180..180 (graus)
  saturation: number;  // 0..3
  brightness: number;  // 0..3
}

export interface ViewSettings {
  avatarSizeMode:  SizeMode;
  sizeMultiplier:  number;         // 0.25..3
  positionX:       number;         // -1000..1000
  positionY:       number;         // -1000..1000
  movementScale:   number;         // 0..3
  backgroundMode:  BackgroundMode;
  backgroundColor: string;         // usado em color/chroma
  filters:         ViewFilters;
}

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  avatarSizeMode:  "auto",
  sizeMultiplier:  1,
  positionX:       0,
  positionY:       0,
  movementScale:   1,
  backgroundMode:  "transparent",
  backgroundColor: "#00FF00",
  filters: { hue: 0, saturation: 1, brightness: 1 },
};