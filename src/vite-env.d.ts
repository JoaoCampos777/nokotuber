/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública da Nokotuber Store API (não é segredo). Default de build da Loja. */
  readonly VITE_STORE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}