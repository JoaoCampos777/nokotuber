<script lang="ts">
  import {
    discordConnection, discordVoiceChannel,
    connectDiscordRpc, disconnectDiscordRpc, refreshSelectedDiscordVoiceChannel,
    loadFakeUsers, handleDiscordSpeakingEvent, authenticateDiscordPoC,
  } from "../../discord/discordIntegrationStore";
  import { FAKE_DISCORD_USERS } from "../../discord/discordVoiceMapper";

  let appId = "";
  $: if (!appId && $discordConnection.applicationId) appId = $discordConnection.applicationId;

  const STATUS_LABEL: Record<string, string> = {
    disabled: "Desativado", not_configured: "Não configurado", connecting: "Conectando…",
    connected: "Conectado", authenticated: "Autenticado", unavailable: "Indisponível", error: "Erro",
  };

  let authScopeMode: "rpc_voice" | "rpc" = "rpc_voice";
  let authBusy = false;
  function scopesFor(mode: string): string[] {
    return mode === "rpc" ? ["rpc"] : ["rpc", "rpc.voice.read"];
  }
  async function tryAuth() {
    authBusy = true;
    try { await authenticateDiscordPoC(scopesFor(authScopeMode)); }
    finally { authBusy = false; }
  }



  const JOAO = FAKE_DISCORD_USERS[0];

  const MARK = FAKE_DISCORD_USERS[1];
  let joaoOn = false, markOn = false;

  function fake(id: string, name: string, on: boolean) {
    handleDiscordSpeakingEvent({ discordUserId: id, discordUserName: name, isSpeaking: on, timestamp: Date.now() });
  }
  function simJoao() { joaoOn = !joaoOn; fake(JOAO.id, JOAO.displayName, joaoOn); }
  function simMark() { markOn = !markOn; fake(MARK.id, MARK.displayName, markOn); }
  function stopAll() {
    if (joaoOn) { fake(JOAO.id, JOAO.displayName, false); joaoOn = false; }
    if (markOn) { fake(MARK.id, MARK.displayName, false); markOn = false; }
  }
  function testEvent() {
    fake(JOAO.id, JOAO.displayName, true);
    setTimeout(() => fake(JOAO.id, JOAO.displayName, false), 700);
  }
</script>

<div class="dc">
  <div class="dc-head">
    <span class="dc-title">Vincular Discord (experimental)</span>
    <span class="dc-status s-{$discordConnection.status}">{STATUS_LABEL[$discordConnection.status] ?? "—"}</span>
  </div>

  <div class="dc-cap" class:on={$discordConnection.authenticated}>
    {#if $discordConnection.authenticated}
      ● Detectando fala por usuário do Discord
    {:else if $discordConnection.connected}
      ○ Conectado ao Discord — mas ainda <b>não</b> detectando quem fala (a leitura de voz exige aprovação do Discord)
    {:else}
      ○ Sem detecção de fala — use o teste fake ou o modo manual
    {/if}
  </div>

  <label class="dc-field">
    <input class="dc-in" placeholder="Application ID do Discord Developer Portal" bind:value={appId} />
    <span class="dc-help">Necessário para testar Discord RPC.</span>
  </label>

  <div class="dc-row">
    <button class="chip" on:click={() => connectDiscordRpc(appId)} disabled={$discordConnection.status === "connecting"}>
      {$discordConnection.status === "connecting" ? "Conectando…" : "Conectar ao Discord"}
    </button>
    <button class="chip" on:click={disconnectDiscordRpc}>Desconectar</button>
    <button class="chip" on:click={refreshSelectedDiscordVoiceChannel}>Atualizar call</button>
  </div>

  {#if $discordConnection.error}
    <div class="dc-err">{$discordConnection.error}</div>
  {/if}

  <div class="dc-auth">
    <div class="dc-auth-title">Autenticação (R2 · via RPC)</div>
    <label class="dc-check">Escopos:
      <select class="dc-in" bind:value={authScopeMode}>
        <option value="rpc_voice">rpc + rpc.voice.read</option>
        <option value="rpc">rpc</option>
      </select>
    </label>
    <button class="chip" on:click={tryAuth} disabled={authBusy || !$discordConnection.connected}>
      {authBusy ? "Aguardando autorização no Discord…" : "Autenticar Discord (via RPC)"}
    </button>
    <p class="dc-note">
      O Discord abre o modal de autorização pelo <b>socket RPC</b> (sem navegador). Requer seu app no
      Developer Portal e sua conta na lista de <b>Testadores</b>. Em dev, a troca do code por token usa a
      variável de ambiente <code>NOKOTUBER_DISCORD_SECRET</code> (nunca embutida; em produção vira um endpoint de troca).
    </p>
  </div>

  {#if $discordVoiceChannel}
    <div class="dc-call">
      <div><b>Servidor:</b> {$discordVoiceChannel.guildName ?? "—"}</div>
      <div><b>Canal:</b> {$discordVoiceChannel.channelName ?? "—"}</div>
      <div><b>Usuários:</b> {$discordVoiceChannel.users.map((u) => u.displayName).join(", ") || "nenhum"}</div>
    </div>
  {/if}

  <div class="dc-test">
    <div class="dc-test-title">Teste sem Discord (usuários fake)</div>
    <button class="chip" on:click={loadFakeUsers}>Carregar usuários fake</button>
    <div class="dc-row">
      <button class="chip" class:on={joaoOn} on:click={simJoao}>{joaoOn ? "● João falando" : "Simular João"}</button>
      <button class="chip" class:on={markOn} on:click={simMark}>{markOn ? "● Mark falando" : "Simular Mark"}</button>
    </div>
    <div class="dc-row">
      <button class="chip" on:click={stopAll}>Parar todos</button>
      <button class="chip" on:click={testEvent}>Testar evento Discord</button>
    </div>
    <p class="dc-note">
      Carregue os usuários fake, vincule cada um a um participante (na seção “Fonte de fala → Discord”
      de cada pessoa) e use os botões acima: só o participante vinculado deve abrir a boca.
    </p>
  </div>

  <p class="dc-note">
    <b>Discord RPC: indisponível no momento.</b> O Discord não liberou os escopos necessários
    (<code>rpc</code>/<code>rpc.voice.read</code>) para detectar fala por usuário. Use o
    <b>Nokotuber Room</b> (acima) para que cada pessoa controle seu avatar pelo próprio microfone.
    Esta seção fica como experimental/arquivada.
  </p>
</div>

<style>
  .dc { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); }
  .dc-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .dc-title { font-size: 11px; font-weight: 700; color: var(--color-text-secondary); }
  .dc-status { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; border: 1px solid var(--color-border-soft); color: var(--color-text-dim); }
  .dc-status.s-authenticated, .dc-status.s-connected { color: var(--color-success); border-color: var(--color-success); }
  .dc-status.s-connecting { color: var(--color-warning); border-color: var(--color-warning); }
  .dc-status.s-unavailable, .dc-status.s-error { color: var(--color-accent); border-color: var(--color-accent-dim); }
  .dc-field { display: flex; flex-direction: column; gap: 2px; }
  .dc-in { background: var(--color-bg-panel-2); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 5px 8px; font-size: 11px; font-family: inherit; }
  .dc-help { font-size: 9px; color: var(--color-text-dim); }
  .dc-row { display: flex; gap: 4px; flex-wrap: wrap; }
  .dc-err { font-size: 10px; color: var(--color-warning); line-height: 1.4; }
  .dc-call { font-size: 10px; color: var(--color-text-secondary); line-height: 1.6; border-top: 1px solid var(--color-border-soft); padding-top: 5px; }
  .dc-test { border-top: 1px solid var(--color-border-soft); padding-top: 6px; display: flex; flex-direction: column; gap: 5px; }
  .dc-test-title { font-size: 10px; font-weight: 700; color: var(--color-accent); }
  .dc-note { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }
  .dc-auth { display: flex; flex-direction: column; gap: 5px; border-top: 1px solid var(--color-border-soft); padding-top: 6px; }
  .dc-auth-title { font-size: 10px; font-weight: 700; color: var(--color-accent); }
  .dc-check { font-size: 10px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 5px; }
  .dc-check code, .dc-note code, .dc-redirect code { background: var(--color-bg-panel-2); padding: 0 3px; border-radius: 3px; word-break: break-all; }
  .dc-redirect { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; }
  .dc-cap { font-size: 10px; line-height: 1.4; padding: 4px 7px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-soft); color: var(--color-text-secondary); background: var(--color-bg-panel-2); }
  .dc-cap.on { color: var(--color-success); border-color: var(--color-success); }
  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .chip:hover:not(:disabled) { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip:disabled { opacity: .5; cursor: default; }
  .chip.on { color: var(--color-accent); border-color: var(--color-accent-dim); background: var(--color-accent-soft); }
</style>