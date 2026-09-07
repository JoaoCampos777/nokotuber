/**
 * Content-Security-Policy do Nokotuber — FONTE ÚNICA DA VERDADE.
 *
 * Por que isto existe: a CSP do Tauri é injetada apenas nos HTML servidos pelo
 * protocolo `tauri://`, ou seja, **só no aplicativo empacotado**. Em `tauri dev`
 * o HTML vem do servidor do Vite e nada é injetado. O efeito prático era o pior
 * possível: a Loja funcionava perfeitamente em desenvolvimento e era bloqueada
 * pela CSP no instalador, sem nenhum aviso durante o desenvolvimento.
 *
 * A correção tem duas pontas, e as duas leem daqui:
 *   - `vite.config.ts` injeta a mesma CSP como <meta http-equiv> em DEV;
 *   - `scripts/tauri-config.mjs` gera o patch de configuração usado por
 *     `tauri dev` / `tauri build`.
 *
 * Assim, um endereço de API que a CSP não permite quebra já no `pnpm dev`.
 */

/** Origens fixas do próprio Tauri (IPC, protocolo de asset) e do Companion (ws). */
const TAURI_CONNECT = ["'self'", "ipc:", "http://ipc.localhost", "ws:", "wss:"];
const TAURI_IMG = ["'self'", "asset:", "http://asset.localhost", "data:", "blob:"];

/** Endereço padrão da Store API quando nada é configurado (backend local). */
export const DEFAULT_STORE_API_URL = "http://localhost:8080";

/**
 * Reduz uma URL à sua origem (`https://host:porta`). Entradas que já são origem
 * passam intactas. Valores vazios/ inválidos são descartados em vez de virarem
 * uma diretiva quebrada.
 */
function toOrigin(value) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function uniq(list) {
  return [...new Set(list.filter(Boolean))];
}

/**
 * Monta a CSP.
 *
 * @param {object} opts
 * @param {string} [opts.apiUrl] URL da Store API (VITE_STORE_API_URL).
 * @param {string} [opts.extraOrigins] Origens extras separadas por vírgula
 *   (NOKOTUBER_CSP_EXTRA_ORIGINS): base pública do R2, endpoint S3 do R2 de onde
 *   vêm as URLs assinadas, e o túnel HTTPS quando se testa webhook localmente.
 * @returns {{ csp: string, origins: string[] }}
 */
export function buildCsp({ apiUrl, extraOrigins } = {}) {
  const api = toOrigin(apiUrl) ?? toOrigin(DEFAULT_STORE_API_URL);
  const extras = String(extraOrigins ?? "")
    .split(",")
    .map(toOrigin)
    .filter(Boolean);

  // Origens da Loja: de onde o app busca catálogo/biblioteca (connect-src) e de
  // onde vêm capas e previews (img-src). Lista explícita — nunca `*` nem
  // `https:` genérico, que liberariam a internet inteira para a webview.
  const storeOrigins = uniq([api, ...extras]);

  const directives = {
    "default-src": ["'self'"],
    "connect-src": uniq([...TAURI_CONNECT, ...storeOrigins]),
    "img-src": uniq([...TAURI_IMG, ...storeOrigins]),
    "style-src": ["'self'", "'unsafe-inline'"],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'", "blob:", "mediastream:"],
  };

  const csp = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");

  return { csp, origins: storeOrigins };
}

/** Lê as variáveis de ambiente relevantes e devolve a CSP correspondente. */
export function buildCspFromEnv(env = process.env) {
  return buildCsp({
    apiUrl: env.VITE_STORE_API_URL,
    extraOrigins: env.NOKOTUBER_CSP_EXTRA_ORIGINS,
  });
}
