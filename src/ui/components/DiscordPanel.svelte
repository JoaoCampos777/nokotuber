<script lang="ts">
  import { discordConnection, connectDiscord, disconnectDiscord, refreshDiscordVoiceState } from "../../discord/discordIntegrationStore";
</script>

<div class="dc">
  <div class="dc-head">
    <span class="dc-title">Discord (experimental)</span>
    {#if $discordConnection.connected}
      <button class="chip on" on:click={disconnectDiscord}>● Conectado</button>
    {:else}
      <button class="chip" on:click={connectDiscord} disabled={$discordConnection.connecting}>
        {$discordConnection.connecting ? "Conectando…" : "Conectar"}
      </button>
    {/if}
  </div>

  {#if $discordConnection.connected && $discordConnection.currentChannelName}
    <div class="dc-line">Canal: {$discordConnection.currentChannelName}
      <button class="link" on:click={refreshDiscordVoiceState}>↻</button></div>
  {/if}

  {#if $discordConnection.error}
    <div class="dc-err">{$discordConnection.error}</div>
  {/if}

  <p class="dc-note">
    Experimental. Pode exigir aprovação no Discord Developer Portal e o Discord aberto no PC.
    Se não funcionar, use “Teste manual” ou microfone. (Bot Companion oficial: versão futura.)
  </p>
</div>

<style>
  .dc { display: flex; flex-direction: column; gap: 5px; padding: 7px; border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); background: var(--color-bg-secondary); }
  .dc-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .dc-title { font-size: 11px; font-weight: 700; color: var(--color-text-secondary); }
  .dc-line { font-size: 11px; color: var(--color-text-secondary); display: flex; gap: 6px; align-items: center; }
  .dc-err { font-size: 10px; color: var(--color-warning); line-height: 1.4; }
  .dc-note { font-size: 10px; color: var(--color-text-dim); line-height: 1.5; margin: 0; }
  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .chip:hover:not(:disabled) { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip:disabled { opacity: .5; cursor: default; }
  .chip.on { color: var(--color-success); border-color: var(--color-success); }
  .link { background: none; border: none; color: var(--color-accent); cursor: pointer; font-size: 11px; padding: 0; }
</style>