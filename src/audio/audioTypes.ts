export type AudioDeviceKind =
  | "default"
  | "input_device"
  | "virtual_source"
  | "future_discord_source";

export interface AudioInputDevice {
  id: string;          // deviceId do navegador, ou "default"
  name: string;        // nome amigável
  kind: AudioDeviceKind;
  isDefault: boolean;
  isAvailable: boolean;
}

export interface AudioSettings {
  inputDeviceId: string;   // "default" = padrão do sistema
  threshold: number;
  smoothing: number;
  releaseMs: number;
  attackMs: number;
}

export interface AudioMeterState {
  volume: number;
  smoothedVolume: number;
  isTalking: boolean;
  selectedDeviceId: string;
  error?: string;
}

/** Dispositivo "Padrão do sistema" sempre presente na lista. */
export const DEFAULT_DEVICE: AudioInputDevice = {
  id: "default",
  name: "Padrão do sistema",
  kind: "default",
  isDefault: true,
  isAvailable: true,
};