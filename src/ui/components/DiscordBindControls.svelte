<script lang="ts">
  import { discordConnection, discordVoiceUsers, bindDiscordUserToParticipant, unbindDiscordUserFromParticipant } from "../../discord/discordIntegrationStore";
  import { audioRouting } from "../../audio/audioBindingStore";
  import { DISCORD_MESSAGES } from "../../discord/discordTypes";

  export let participantId: string;
  $: binding = $audioRouting.bindings.find((b) => b.participantId === participantId);

  let manualName = "";
  let manualId = "";
  function bindManual() {
    const name = manualName.trim();
    if (!name) return;
    bindDiscordUserToParticipant(participantId, manualId.trim() || `user_${name}`, name);
    manualName = ""; manualId = "";
  }
</script>

<div class="db">
  {#if binding?.externalUserName}
    <div class="db-bound">
      <span>🔗 {binding.externalUserName}</span>
      <button class="chip" on:click={() => unbindDiscordUserFromParticipant(participantId)}>Desvincular</button>
    </div>
  {/if}

  {#if $discordVoiceUsers.length}
    <div class="db-users">
      {#each $discordVoiceUsers as u (u.id)}
        <button class="chip wide" on:click={() => bindDiscordUserToParticipant(participantId, u.id, u.displayName)}>
          {u.displayName}{u.isSpeaking ? " • falando" : ""}
        </button>
      {/each}
    </div>
  {:else}
    <div class="db-msg">{$discordConnection.error ?? DISCORD_MESSAGES.noUsers}</div>
    <div class="db-manual">
      <input class="db-in" placeholder="Nome do usuário Discord" bind:value={manualName} />
      <input class="db-in" placeholder="ID (opcional)" bind:value={manualId} />
      <button class="chip" on:click={bindManual}>Salvar vínculo</button>
    </div>
    <p class="db-hint">{DISCORD_MESSAGES.useManual}</p>
  {/if}
</div>

<style>
  .db { display: flex; flex-direction: column; gap: 5px; padding: 6px; border: 1px dashed var(--color-border); border-radius: var(--radius-sm); }
  .db-bound { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11px; color: var(--color-text-secondary); }
  .db-users { display: flex; flex-direction: column; gap: 3px; }
  .db-msg { font-size: 10px; color: var(--color-warning); line-height: 1.4; }
  .db-manual { display: flex; flex-direction: column; gap: 4px; }
  .db-in { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 6px; font-size: 11px; font-family: inherit; }
  .db-hint { font-size: 10px; color: var(--color-text-dim); margin: 0; }
  .chip { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-soft); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .chip:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
  .chip.wide { text-align: left; width: 100%; }
</style>