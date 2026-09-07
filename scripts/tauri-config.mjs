/**
 * Gera o patch de configuração do Tauri com a CSP correta para ESTE build.
 *
 * A URL da Store API muda por build (localhost em dev, o domínio público nos
 * instaladores distribuídos), e a CSP precisa listá-la explicitamente. Como
 * `tauri.conf.json` é estático, o valor entra por aqui: o script escreve
 * `src-tauri/tauri.conf.csp.json` e os scripts do package.json passam esse
 * arquivo em `tauri --config`.
 *
 * Uso:
 *   node --env-file-if-exists=.env scripts/tauri-config.mjs
 *
 * Variáveis lidas:
 *   VITE_STORE_API_URL             URL pública da Store API
 *   NOKOTUBER_CSP_EXTRA_ORIGINS    origens extras (R2 público, endpoint S3 do
 *                                  R2, túnel HTTPS de teste), separadas por vírgula
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildCspFromEnv, DEFAULT_STORE_API_URL } from "./csp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "src-tauri", "tauri.conf.csp.json");

const api = process.env.VITE_STORE_API_URL?.trim();

/**
 * Em CI (ou em qualquer build destinado a distribuição) a URL da Loja é
 * OBRIGATÓRIA. Sem ela o instalador sai apontando para http://localhost:8080 e
 * a Loja simplesmente não existe para quem instalar — foi o que aconteceu com
 * os pacotes de macOS. Melhor quebrar o build com uma mensagem clara.
 *
 * Ligado por NOKOTUBER_REQUIRE_STORE_API_URL=1 (os workflows definem isso).
 */
const exigeApi = ["1", "true", "yes", "sim"].includes(
  (process.env.NOKOTUBER_REQUIRE_STORE_API_URL ?? "").trim().toLowerCase(),
);
if (exigeApi && !api) {
  console.error(
    [
      "",
      "[csp] ERRO: VITE_STORE_API_URL não está definida.",
      "",
      "  Este build seria distribuído apontando para http://localhost:8080,",
      "  ou seja, com a Loja inacessível para quem instalasse.",
      "",
      "  No GitHub Actions: Settings > Secrets and variables > Actions > Variables,",
      "  crie a variable VITE_STORE_API_URL com a URL pública da Store API",
      "  (ex.: https://SEU-APP.up.railway.app). Não é segredo, mas também não",
      "  fica escrita no workflow.",
      "",
      "  Localmente: defina no .env da raiz do app, ou rode sem",
      "  NOKOTUBER_REQUIRE_STORE_API_URL para aceitar o padrão local.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const { csp, origins } = buildCspFromEnv();

writeFileSync(
  target,
  JSON.stringify(
    {
      $schema: "https://schema.tauri.app/config/2",
      app: { security: { csp } },
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`[csp] Store API: ${api || `${DEFAULT_STORE_API_URL} (padrão — VITE_STORE_API_URL não definida)`}`);
console.log(`[csp] origens liberadas: ${origins.join(", ")}`);
console.log(`[csp] patch gravado em: ${path.relative(root, target)}`);
