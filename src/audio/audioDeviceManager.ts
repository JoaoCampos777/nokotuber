import { writable, get } from "svelte/store";
import type { AudioInputDevice } from "./audioTypes";
import { DEFAULT_DEVICE } from "./audioTypes";

const DEVICE_KEY = "nokotuber:audioDeviceId:v1";

/** Lista de dispositivos disponíveis (sempre começa com "Padrão do sistema"). */
export const audioDevices = writable<AudioInputDevice[]>([DEFAULT_DEVICE]);

/** Id do dispositivo selecionado ("default" = padrão do sistema). */
export const selectedDeviceId = writable<string>(loadSavedDeviceId());

/** Mensagem de erro amigável de áudio (vazia = sem erro). */
export const audioError = writable<string>("");

function loadSavedDeviceId(): string {
  try { return localStorage.getItem(DEVICE_KEY) || "default"; }
  catch { return "default"; }
}

// Persiste a escolha (somente fora da janela de performance, que recebe via sync futuro)
selectedDeviceId.subscribe((id) => {
  try { localStorage.setItem(DEVICE_KEY, id); } catch {}
});

/**
 * Lista os microfones do sistema.
 * Para obter os NOMES, o navegador exige uma permissão de áudio ativa;
 * por isso pedimos um getUserMedia rápido só para "destravar" os rótulos.
 */
export async function refreshAudioDevices(): Promise<void> {
  audioError.set("");

  if (!navigator.mediaDevices?.enumerateDevices) {
    audioDevices.set([DEFAULT_DEVICE]);
    audioError.set("Este ambiente não permite listar microfones.");
    return;
  }

  // Tenta destravar os rótulos pedindo permissão (silenciosamente).
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach((t) => t.stop());
  } catch {
    // Sem permissão: ainda listamos, mas sem nomes amigáveis.
  }

  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    const inputs = all.filter((d) => d.kind === "audioinput");

    const devices: AudioInputDevice[] = [DEFAULT_DEVICE];
    inputs.forEach((d, i) => {
      if (!d.deviceId || d.deviceId === "default" || d.deviceId === "communications") return;
      devices.push({
        id: d.deviceId,
        name: d.label || `Microfone ${i + 1}`,
        kind: "input_device",
        isDefault: false,
        isAvailable: true,
      });
    });

    audioDevices.set(devices);

    if (devices.length === 1) {
      audioError.set("Nenhum dispositivo de entrada disponível.");
    }

    // Se o dispositivo salvo não existe mais, volta para o padrão e avisa.
    const sel = get(selectedDeviceId);
    if (sel !== "default" && !devices.some((d) => d.id === sel)) {
      selectedDeviceId.set("default");
      audioError.set("Microfone não encontrado. Usando o padrão do sistema.");
    }
  } catch (err) {
    console.error("[audio] enumerateDevices falhou:", err);
    audioDevices.set([DEFAULT_DEVICE]);
    audioError.set("Não foi possível listar os microfones.");
  }
}

export function setAudioDevice(id: string): void {
  selectedDeviceId.set(id);
}

/** Restrição de getUserMedia para o device atual (ou padrão). */
export function currentAudioConstraints(): MediaStreamConstraints {
  const id = get(selectedDeviceId);
  if (id && id !== "default") {
    return { audio: { deviceId: { exact: id } } };
  }
  return { audio: true };
}