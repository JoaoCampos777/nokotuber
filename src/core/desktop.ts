import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export async function getAppVersion(): Promise<string> {
  try { return await invoke<string>("app_version"); }
  catch { return "0.1.0"; }
}

/**
 * Alterna a janela de performance.
 * Retorna true se ficou aberta, false se fechou.
 */
export async function togglePerformanceWindow(): Promise<boolean> {
  try {
    return await invoke<boolean>("toggle_performance_window");
  } catch (err) {
    console.error("[desktop] Falha ao alternar performance:", err);
    throw new Error("Não foi possível alternar o Modo Performance.");
  }
}

export async function closePerformanceWindow(): Promise<void> {
  try { await invoke("close_performance_window"); }
  catch (err) { console.error("[desktop] Falha ao fechar performance:", err); }
}

export async function importImageFile(): Promise<string | null> {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Imagens", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (!selected || typeof selected !== "string") return null;
    return await invoke<string>("read_image_as_base64", { path: selected });
  } catch (err) {
    console.error("[desktop] Falha ao importar imagem:", err);
    return null;
  }
}

/**
 * Pede ao usuário um local e salva o projeto.
 * Retorna o caminho salvo, ou null se cancelado.
 */
export async function saveProjectAs(content: string, defaultName: string): Promise<string | null> {
  const path = await save({
    filters: [{ name: "Nokotuber Project", extensions: ["noko"] }],
    defaultPath: defaultName,
  });
  if (!path) return null;
  await invoke("save_project_file", { path, content });
  return path;
}

/**
 * Sobrescreve o arquivo existente.
 */
export async function saveProjectAtPath(path: string, content: string): Promise<void> {
  await invoke("save_project_file", { path, content });
}

/**
 * Pede ao usuário um arquivo .noko e retorna o conteúdo.
 */
export async function openProjectFile(): Promise<{ path: string; content: string } | null> {
  const selected = await open({
    multiple: false,
    filters: [
      { name: "Nokotuber Project", extensions: ["noko", "json"] },
    ],
  });
  if (!selected || typeof selected !== "string") return null;
  const content = await invoke<string>("open_project_file", { path: selected });
  return { path: selected, content };
}

/**
 * Pede ao usuário um caminho e exporta o projeto como ZIP.
 */
export async function exportProjectZip(projectJson: string, defaultName: string): Promise<string | null> {
  const zipPath = await save({
    filters: [{ name: "ZIP", extensions: ["zip"] }],
    defaultPath: defaultName,
  });
  if (!zipPath) return null;
  await invoke("export_project_zip", { zipPath, projectJson });
  return zipPath;
}

export function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}