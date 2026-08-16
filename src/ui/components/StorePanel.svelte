<script lang="ts">
  import { onMount } from "svelte";
  import { storeOpen, closeStore } from "../../store/storeUi";
  import {
    storeSession, login, register, logout,
    storeProducts, storeLibrary, loadProducts, loadLibrary,
    buy, ownsProduct, downloadProductAsset,
    storeApiBase, setStoreApiBase, StoreError, type StoreProductCard,
  } from "../../store/storeClient";
  import { get } from "svelte/store";
  import { project, addProjectAddon, updateProjectAddon } from "../../project/projectStore";
  import { uiPrefs } from "../uiPrefsStore";

  let tab: "loja" | "lib" = "loja";
  let authMode: "login" | "register" = "login";
  let email = ""; let password = "";
  let busy = false; let msg = ""; let msgType: "info" | "error" | "ok" = "info";
  let selected: StoreProductCard | null = null;
  let search = ""; let category = "all";
  let apiBase = "";

  const categories = [
    { id: "all", label: "Todos" }, { id: "oculos", label: "Óculos" },
    { id: "chapeus", label: "Chapéus" }, { id: "mascaras", label: "Máscaras" },
    { id: "outros", label: "Outros" },
  ];

  function say(m: string, t: "info" | "error" | "ok" = "info") { msg = m; msgType = t; }
  function errText(e: unknown): string {
    const code = e instanceof StoreError ? e.code : "erro";
    const map: Record<string, string> = {
      network_error: "Não foi possível falar com a Loja. Confira o endereço da API e se o servidor está no ar.",
      invalid_credentials: "E-mail ou senha incorretos.", email_taken: "Este e-mail já tem conta.",
      already_owned: "Você já possui este item.", product_not_found: "Produto indisponível.",
      not_entitled: "Item não disponível nesta conta.", checkout_failed: "Falha ao iniciar o pagamento. Tente de novo.",
      asset_unavailable: "O arquivo deste acessório não está disponível.",
      file_missing: "O arquivo deste acessório não está disponível.",
      download_failed: "Não foi possível baixar este acessório.",
      read_error: "Não foi possível processar o acessório.",
      invalid_or_expired: "O link do acessório expirou. Tente de novo.",
      unauthorized: "Sua sessão expirou. Entre novamente.",
      invalid_refresh: "Sua sessão expirou. Entre novamente.",
    };
    return map[code] ?? "Ocorreu um erro. Tente novamente.";
  }

  onMount(() => { apiBase = $storeApiBase; refresh(); });
  $: if ($storeOpen) { /* recarrega ao abrir */ void 0; }

  async function refresh() {
    busy = true;
    try {
      await loadProducts(category, search.trim() || undefined);
      if ($storeSession) await loadLibrary();
    } catch (e) { say(errText(e), "error"); }
    finally { busy = false; }
  }

  async function doAuth() {
    if (!email.trim() || password.length < 8) { say("Informe e-mail e senha (mín. 8 caracteres).", "info"); return; }
    busy = true; say("");
    try {
      if (authMode === "login") await login(email.trim(), password);
      else await register(email.trim(), password);
      password = ""; await refresh(); say("Bem-vindo!", "ok");
    } catch (e) { say(errText(e), "error"); }
    finally { busy = false; }
  }
  async function doLogout() { await logout(); storeLibrary.set([]); say("Você saiu.", "info"); }

  async function buyProduct(p: StoreProductCard) {
    busy = true; say("");
    try {
      const r = await buy(p.id);
      if (r.free) say(`"${p.name}" adicionado à sua biblioteca.`, "ok");
      else say("Abrimos o pagamento no navegador. Depois de pagar, volte e toque em “Atualizar compras”.", "info");
    } catch (e) { say(errText(e), "error"); }
    finally { busy = false; }
  }
  async function refreshPurchases() {
    busy = true; try { await loadLibrary(); say("Compras atualizadas.", "ok"); } catch (e) { say(errText(e), "error"); } finally { busy = false; }
  }
  async function addToCharacter(p: StoreProductCard) {
    if (get(project).addons?.some((a) => a.productId === p.id)) { say(`"${p.name}" já está no personagem.`, "info"); return; }
    busy = true; say("");
    console.log("[store] Add to character productId=", p.id);
    try {
      const { dataUrl, version } = await downloadProductAsset(p.id, p.version);
      console.log("[store] creating marketplace addon");
      const id = addProjectAddon();
      updateProjectAddon(id, { name: p.name, image: dataUrl, source: "marketplace", productId: p.id, author: p.author, version, visible: true });
      console.log("[store] addon inserted into character", id);
      say(`"${p.name}" adicionado ao personagem (aba Avatar → Acessórios).`, "ok");
    } catch (e) {
      console.error("[store] Failed to add marketplace addon:", e);
      const t = errText(e);
      say(t === "Ocorreu um erro. Tente novamente." ? "Não foi possível adicionar o acessório ao personagem." : t, "error");
    } finally { busy = false; }
  }
  function price(p: StoreProductCard): string {
    return p.priceCents <= 0 ? "Grátis" : (p.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: p.currency || "BRL" });
  }
  function saveApi() { setStoreApiBase(apiBase); say("Endereço da Loja salvo.", "ok"); refresh(); }
</script>

{#if $storeOpen}
<div class="ov" role="presentation" on:click|self={closeStore}>
  <div class="store">
    <header class="st-head">
      <span class="st-title">🛒 Loja Nokotuber</span>
      <div class="st-head-r">
        {#if $storeSession}<span class="st-user">{$storeSession.email}</span>
          <button class="b" on:click={doLogout}>Sair</button>{/if}
        <button class="b" on:click={closeStore}>Fechar</button>
      </div>
    </header>

    {#if !$storeSession}
      <div class="st-auth">
        <p class="st-sub">Entre para comprar e guardar seus acessórios. Você ainda pode importar PNGs próprios de graça, sem conta.</p>
        <div class="st-tabs">
          <button class="chip" class:on={authMode === "login"} on:click={() => authMode = "login"}>Entrar</button>
          <button class="chip" class:on={authMode === "register"} on:click={() => authMode = "register"}>Criar conta</button>
        </div>
        <input class="in" type="email" placeholder="E-mail" bind:value={email} />
        <input class="in" type="password" placeholder="Senha (mín. 8)" bind:value={password} on:keydown={(e) => e.key === "Enter" && doAuth()} />
        <button class="b accent full" disabled={busy} on:click={doAuth}>{authMode === "login" ? "Entrar" : "Criar conta"}</button>
      </div>
    {:else}
      <div class="st-tabs">
        <button class="chip" class:on={tab === "loja"} on:click={() => tab = "loja"}>Loja</button>
        <button class="chip" class:on={tab === "lib"} on:click={() => { tab = "lib"; refreshPurchases(); }}>Minha Biblioteca</button>
        <button class="chip" disabled={busy} on:click={refreshPurchases}>↻ Atualizar compras</button>
      </div>

      {#if tab === "loja"}
        <div class="st-filters">
          <input class="in" placeholder="Pesquisar acessórios…" bind:value={search} on:keydown={(e) => e.key === "Enter" && refresh()} />
          <div class="st-cats">
            {#each categories as c}
              <button class="chip sm" class:on={category === c.id} on:click={() => { category = c.id; refresh(); }}>{c.label}</button>
            {/each}
          </div>
        </div>
        <div class="grid">
          {#each $storeProducts as p (p.id)}
            <div class="card">
              <div class="card-img">{#if p.previewImages?.[0]}<img src={p.previewImages[0]} alt={p.name} />{:else}<span class="ph">🎀</span>{/if}</div>
              <div class="card-name">{p.name}</div>
              <div class="card-author">por {p.author ?? "Nokotuber"}</div>
              <div class="card-price">{price(p)}</div>
              {#if ownsProduct(p.id)}
                <div class="owned">✓ Adquirido</div>
                <button class="b accent full" disabled={busy} on:click={() => addToCharacter(p)}>Adicionar ao personagem</button>
              {:else}
                <button class="b full" on:click={() => selected = p}>Ver detalhes</button>
                <button class="b accent full" disabled={busy} on:click={() => buyProduct(p)}>{p.priceCents <= 0 ? "Obter grátis" : "Comprar"}</button>
              {/if}
            </div>
          {/each}
          {#if $storeProducts.length === 0}<p class="empty">Nenhum produto encontrado.</p>{/if}
        </div>
      {:else}
        <div class="grid">
          {#each $storeLibrary as it (it.productId)}
            <div class="card">
              <div class="card-img">{#if it.product.previewImages?.[0]}<img src={it.product.previewImages[0]} alt={it.product.name} />{:else}<span class="ph">🎀</span>{/if}</div>
              <div class="card-name">{it.product.name}</div>
              <div class="owned">✓ adquirido</div>
              <button class="b accent full" disabled={busy} on:click={() => addToCharacter(it.product)}>Adicionar ao personagem</button>
            </div>
          {/each}
          {#if $storeLibrary.length === 0}<p class="empty">Sua biblioteca está vazia. Compre ou obtenha itens grátis na Loja.</p>{/if}
        </div>
      {/if}
    {/if}

    {#if $uiPrefs.mode === "advanced"}
      <div class="st-api">
        <span class="st-api-lbl">Endereço da Loja (API):</span>
        <input class="in sm" bind:value={apiBase} placeholder="http://localhost:8080" />
        <button class="b" on:click={saveApi}>Salvar</button>
      </div>
    {/if}

    {#if msg}<div class="st-msg {msgType}">{msg}</div>{/if}
  </div>

  {#if selected}
    <div class="detail-ov" role="presentation" on:click|self={() => selected = null}>
      <div class="detail">
        <div class="detail-img">{#if selected.previewImages?.[0]}<img src={selected.previewImages[0]} alt={selected.name} />{:else}<span class="ph big">🎀</span>{/if}</div>
        <h3>{selected.name}</h3>
        <div class="card-author">por {selected.author ?? "Nokotuber"} · v{selected.version}</div>
        <p class="detail-desc">{selected.description}</p>
        <div class="card-price big">{price(selected)}</div>
        {#if ownsProduct(selected.id)}
          <div class="owned">✓ Você possui este item</div>
          <button class="b accent full" disabled={busy} on:click={() => { addToCharacter(selected); }}>Adicionar ao personagem</button>
        {:else}
          <button class="b accent full" disabled={busy} on:click={() => buyProduct(selected)}>{selected.priceCents <= 0 ? "Obter grátis" : "Comprar"}</button>
        {/if}
        <button class="b full" on:click={() => selected = null}>Voltar</button>
      </div>
    </div>
  {/if}
</div>
{/if}

<style>
  .ov { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 4200; padding: 16px; font-family: system-ui, sans-serif; }
  .store { box-sizing: border-box; width: 100%; max-width: 680px; max-height: 88vh; overflow-y: auto; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .st-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .st-title { font-size: 16px; font-weight: 800; color: var(--color-text-primary); }
  .st-head-r { display: flex; align-items: center; gap: 6px; }
  .st-user { font-size: 11px; color: var(--color-text-dim); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .st-sub { font-size: 12px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }
  .st-auth { display: flex; flex-direction: column; gap: 7px; }
  .st-tabs { display: flex; gap: 5px; flex-wrap: wrap; }
  .st-filters { display: flex; flex-direction: column; gap: 6px; }
  .st-cats { display: flex; gap: 4px; flex-wrap: wrap; }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .card { border: 1px solid var(--color-border-soft); border-radius: 10px; background: var(--color-bg-panel-2); padding: 8px; display: flex; flex-direction: column; gap: 5px; }
  .card-img { height: 90px; border-radius: 6px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .card-img img { width: 100%; height: 100%; object-fit: contain; }
  .ph { font-size: 34px; } .ph.big { font-size: 64px; }
  .card-name { font-size: 12px; font-weight: 700; color: var(--color-text-primary); }
  .card-author { font-size: 10px; color: var(--color-text-dim); }
  .card-price { font-size: 13px; font-weight: 700; color: var(--color-accent); } .card-price.big { font-size: 18px; }
  .owned { font-size: 11px; color: var(--color-success); font-weight: 700; }
  .empty { grid-column: 1 / -1; text-align: center; font-size: 11px; color: var(--color-text-dim); padding: 16px; }

  .st-api { display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--color-border-soft); padding-top: 8px; }
  .st-api-lbl { font-size: 10px; color: var(--color-text-dim); white-space: nowrap; }
  .st-msg { font-size: 11px; padding: 7px 10px; border-radius: 7px; }
  .st-msg.info { background: var(--color-bg-panel-2); color: var(--color-text-secondary); }
  .st-msg.ok { background: #1b3a2a; color: #6dd49f; }
  .st-msg.error { background: #3a1a22; color: #e85c7a; }

  .in { width: 100%; box-sizing: border-box; background: var(--color-bg-panel-2); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: 7px; padding: 8px 10px; font-size: 13px; font-family: inherit; }
  .in.sm { flex: 1; padding: 5px 8px; font-size: 11px; }
  .b { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: 7px; padding: 6px 11px; font-size: 12px; cursor: pointer; font-family: inherit; }
  .b:hover:not(:disabled) { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .b:disabled { opacity: .5; cursor: not-allowed; }
  .b.accent { background: var(--color-accent); color: #fff; border-color: var(--color-accent); font-weight: 600; }
  .b.accent:hover:not(:disabled) { background: var(--color-accent-hover); }
  .b.full { width: 100%; }
  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: 999px; padding: 4px 12px; font-size: 12px; cursor: pointer; font-family: inherit; }
  .chip.sm { padding: 3px 9px; font-size: 11px; }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }
  .chip:disabled { opacity: .5; cursor: not-allowed; }

  .detail-ov { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 4300; padding: 16px; }
  .detail { box-sizing: border-box; width: 100%; max-width: 360px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
  .detail h3 { margin: 0; font-size: 16px; color: var(--color-text-primary); }
  .detail-img { height: 160px; border-radius: 8px; background: var(--color-bg-panel-2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .detail-img img { width: 100%; height: 100%; object-fit: contain; }
  .detail-desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; margin: 0; }
</style>
