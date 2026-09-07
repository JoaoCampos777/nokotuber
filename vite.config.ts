import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { buildCspFromEnv } from "./scripts/csp.mjs";

const host = process.env.TAURI_DEV_HOST;

/**
 * Aplica a MESMA CSP do aplicativo empacotado durante o `vite dev`.
 *
 * O Tauri só injeta `app.security.csp` nos HTML servidos pelo protocolo
 * `tauri://` — isto é, apenas no build. Em `tauri dev` o HTML vem daqui, então
 * sem este plugin a CSP simplesmente não existe em desenvolvimento e um endereço
 * de API não autorizado só aparece como erro no instalador final.
 *
 * Roda somente em `serve`: no build quem manda é o Tauri (ver
 * scripts/tauri-config.mjs), para não haver duas CSPs se sobrepondo.
 */
function devCspPlugin(): Plugin {
  return {
    name: "nokotuber-dev-csp",
    apply: "serve",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const { csp } = buildCspFromEnv();
        return {
          html,
          tags: [
            {
              tag: "meta",
              attrs: { "http-equiv": "Content-Security-Policy", content: csp },
              injectTo: "head-prepend",
            },
          ],
        };
      },
    },
  };
}

export default defineConfig({
  plugins: [svelte(), devCspPlugin()],

  clearScreen: false,

  server: {
    host: host || false,
    port: 1420,
    strictPort: true,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  envPrefix: ["VITE_", "TAURI_ENV_*"],

  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows"
        ? "chrome105"
        : "safari13",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      input: {
        main: "index.html",
        companionStage: "companion-stage.html",
      },
    },
  },
});
