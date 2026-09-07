import { writable, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";

/**
 * Cliente da Nokotuber Store API (backend em store-backend/). O app NUNCA decide
 * "pago": só lê catálogo, cria checkout (abre no navegador) e consulta a biblioteca
 * (entitlements) — a verdade de posse é do backend. Tokens ficam em localStorage
 * (o entitlement é validado no servidor, então o token local não "libera" nada).
 * TODO futuro: mover tokens para armazenamento seguro do SO (keychain/stronghold).
 */

// ─── Config: base URL da API ───
// Default de BUILD: VITE_STORE_API_URL (produção nos builds distribuídos) com
// fallback para localhost (dev). A URL pública NÃO é segredo. O usuário ainda
// pode sobrescrever em runtime (modo Avançado → salvo em localStorage).
const CFG_KEY = "nokotuber:storeApi:v1";
const DEFAULT_BASE = (import.meta.env.VITE_STORE_API_URL ?? "").trim() || "http://localhost:8080";
function loadBase(): string { try { return localStorage.getItem(CFG_KEY) || DEFAULT_BASE; } catch { return DEFAULT_BASE; } }
export const storeApiBase = writable<string>(loadBase());
storeApiBase.subscribe((v) => { try { localStorage.setItem(CFG_KEY, v); } catch {} });
export function setStoreApiBase(url: string): void { storeApiBase.set((url || "").trim() || DEFAULT_BASE); }

// ─── Tokens + sessão ───
const TOK_KEY = "nokotuber:storeTokens:v1";
interface Tokens { accessToken: string; refreshToken: string; userId: string; email: string; }
function loadTokens(): Tokens | null { try { const r = localStorage.getItem(TOK_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function saveTokens(t: Tokens | null): void {
  try { if (t) localStorage.setItem(TOK_KEY, JSON.stringify(t)); else localStorage.removeItem(TOK_KEY); } catch {}
}

let tokens: Tokens | null = loadTokens();
export interface StoreSession { userId: string; email: string; }
export const storeSession = writable<StoreSession | null>(tokens ? { userId: tokens.userId, email: tokens.email } : null);

function setSession(t: Tokens | null): void {
  tokens = t; saveTokens(t);
  storeSession.set(t ? { userId: t.userId, email: t.email } : null);
}

export class StoreError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

// ─── fetch com auth + refresh automático (1 tentativa) ───
async function request<T>(path: string, opts: { method?: string; body?: any; auth?: boolean } = {}): Promise<T> {
  const base = get(storeApiBase);
  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (opts.auth && tokens?.accessToken) headers.authorization = `Bearer ${tokens.accessToken}`;
    return fetch(base + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  };

  let res: Response;
  try { res = await doFetch(); }
  catch { throw new StoreError(0, "network_error"); }

  if (res.status === 401 && opts.auth && tokens?.refreshToken) {
    if (await tryRefresh()) { try { res = await doFetch(); } catch { throw new StoreError(0, "network_error"); } }
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new StoreError(res.status, (data as any)?.error ?? `http_${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  if (!tokens?.refreshToken) return false;
  try {
    const r = await request<{ accessToken: string; refreshToken: string }>("/auth/refresh", { method: "POST", body: { refreshToken: tokens.refreshToken } });
    setSession({ ...tokens, accessToken: r.accessToken, refreshToken: r.refreshToken });
    return true;
  } catch { setSession(null); return false; }
}

// ─── Auth ───
export async function register(email: string, password: string): Promise<void> {
  const r = await request<Tokens>("/auth/register", { method: "POST", body: { email, password } });
  setSession(r);
}
export async function login(email: string, password: string): Promise<void> {
  const r = await request<Tokens>("/auth/login", { method: "POST", body: { email, password } });
  setSession(r);
}
export async function logout(): Promise<void> {
  const rt = tokens?.refreshToken;
  setSession(null);
  if (rt) { try { await request("/auth/logout", { method: "POST", body: { refreshToken: rt } }); } catch {} }
}

// ─── Catálogo / Biblioteca ───
export interface StoreProductCard {
  id: string; slug: string; name: string; description: string; author?: string;
  priceCents: number; currency: string; previewImages: string[]; category: string; tags: string[]; version: string;
}
export const storeProducts = writable<StoreProductCard[]>([]);
export const storeLibrary = writable<{ productId: string; product: StoreProductCard }[]>([]);

export async function loadProducts(category?: string, q?: string): Promise<void> {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (q) params.set("q", q);
  const r = await request<{ products: StoreProductCard[] }>(`/store/products?${params.toString()}`);
  storeProducts.set(r.products);
}
export async function loadLibrary(): Promise<void> {
  if (!tokens) { storeLibrary.set([]); return; }
  const r = await request<{ items: { product: StoreProductCard }[] }>("/library", { auth: true });
  storeLibrary.set(r.items.map((i) => ({ productId: i.product.id, product: i.product })));
}
export function ownsProduct(productId: string): boolean {
  return get(storeLibrary).some((i) => i.productId === productId);
}

// ─── Compra ───
export interface CheckoutResult { free?: boolean; orderId: string; checkoutUrl?: string; }
export async function buy(productId: string): Promise<CheckoutResult> {
  const r = await request<CheckoutResult>("/store/checkout", { method: "POST", body: { productId }, auth: true });
  if (r.free) { await loadLibrary(); return r; }
  if (r.checkoutUrl) { try { await invoke("open_external_url", { url: r.checkoutUrl }); } catch {} }
  return r;
}

// ─── Download autorizado do asset (para usar no personagem) ───
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new StoreError(0, "read_error"));
    fr.readAsDataURL(blob);
  });
}

/**
 * Baixa o arquivo do produto (verifica entitlement no backend) e retorna data URL.
 * Usa cache no diretório do app (não localStorage) para não rebaixar toda vez.
 *
 * DECISÃO CONSCIENTE (cache x revogação): um asset já baixado continua utilizável
 * mesmo que o entitlement seja revogado depois (reembolso). É deliberado — o
 * acessório já está aplicado no personagem do usuário e invalidar o cache
 * quebraria o uso offline legítimo de quem comprou de boa-fé. A revogação vale
 * para tudo que exige o servidor: catálogo, biblioteca e novos downloads
 * (/library/download revalida o entitlement a cada entrega).
 */
export async function downloadProductAsset(productId: string, version?: string): Promise<{ dataUrl: string; version: string }> {
  // 1) cache local (diretório do app) — evita rebaixar
  if (version) {
    try {
      const cached = await invoke<string | null>("read_marketplace_asset", { productId, version });
      if (cached) { console.log("[store] asset cache hit", productId, version); return { dataUrl: cached, version }; }
    } catch { /* fora do Tauri / sem cache — segue para download */ }
  }
  console.log("[store] requesting authorized download", productId);
  const meta = await request<{ downloadUrl: string; version: string }>(`/library/product/${productId}/download`, { auth: true });
  console.log("[store] entitlement verified; downloading asset");

  // A versão do PRODUTO (usada na sondagem acima) pode não ser a do ASSET — o
  // admin pode subir a versão do produto sem publicar um arquivo novo. Sem esta
  // segunda sondagem, com a versão que o servidor acabou de informar, o cache
  // nunca acertava e o arquivo era rebaixado a cada uso.
  if (meta.version !== version) {
    try {
      const cached = await invoke<string | null>("read_marketplace_asset", { productId, version: meta.version });
      if (cached) { console.log("[store] asset cache hit (versão do asset)", productId, meta.version); return { dataUrl: cached, version: meta.version }; }
    } catch { /* fora do Tauri / sem cache — segue para download */ }
  }

  let res: Response;
  try { res = await fetch(meta.downloadUrl); } catch { throw new StoreError(0, "download_failed"); }
  if (!res.ok) throw new StoreError(res.status, "download_failed");
  const dataUrl = await blobToDataUrl(await res.blob());
  console.log("[store] asset downloaded", productId, meta.version);
  // 2) grava no cache do app (best-effort)
  try { await invoke("write_marketplace_asset", { productId, version: meta.version, dataUrl }); console.log("[store] asset cached to app dir"); }
  catch { /* cache é best-effort */ }
  return { dataUrl, version: meta.version };
}
