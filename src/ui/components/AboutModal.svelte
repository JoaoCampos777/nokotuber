<script lang="ts">
  import {
    APP_NAME,
    APP_TAGLINE,
    APP_VERSION,
    APP_CREATOR,
    APP_CONTACT,
    APP_PARTNERSHIP,
  } from "../../config/brand";
  import { APP_ICON_URL, CREATOR_AVATAR_URL } from "../../config/defaultAvatar";
  import { getAppVersion } from "../../core/desktop";
  import { onMount } from "svelte";

  export let onClose: () => void;

  // Versão real vem do Tauri (tauri.conf.json); APP_VERSION é só fallback.
  let displayVersion = APP_VERSION;
  onMount(async () => { try { displayVersion = await getAppVersion(); } catch {} });

  function handleEmailClick() {
    window.location.href = `mailto:${APP_CONTACT.email}?subject=Contato%20-%20${APP_NAME}`;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="backdrop" on:click={handleBackdropClick} role="presentation">
  <div class="modal" role="dialog" aria-labelledby="about-title">
    <button class="close-btn" on:click={onClose} title="Fechar (Esc)">×</button>

    <div class="header">
      <img src={APP_ICON_URL} alt={APP_NAME} class="brand-icon" />
      <div class="header-text">
        <h2 id="about-title">{APP_NAME}</h2>
        <p class="tagline">{APP_TAGLINE}</p>
        <span class="version">v{displayVersion}</span>
      </div>
    </div>

    <div class="divider" />

    <section class="section">
      <h3>Sobre</h3>
      <p>
        O {APP_NAME} é uma ferramenta criada para facilitar o uso de PNGTubers, permitindo
        que criadores de conteúdo, streamers e usuários em geral configurem personagens
        animados de forma simples, rápida e visual.
      </p>
    </section>

    <section class="section">
      <h3>Criador</h3>
      <div class="creator-row">
        <img
          src={CREATOR_AVATAR_URL}
          alt={APP_CREATOR.name}
          class="creator-avatar"
        />
        <div>
          <div class="creator-name">{APP_CREATOR.name}</div>
          <div class="creator-role">{APP_CREATOR.role}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <h3>Contato</h3>
      <div class="contact-grid">
        <button class="contact-card" on:click={handleEmailClick}>
          <span class="contact-icon">✉</span>
          <div class="contact-info">
            <span class="contact-label">E-mail</span>
            <span class="contact-value">{APP_CONTACT.email}</span>
          </div>
        </button>

        <button
          class="contact-card"
          on:click={() => copyToClipboard(APP_CONTACT.discord)}
        >
          <span class="contact-icon">◈</span>
          <div class="contact-info">
            <span class="contact-label">Discord</span>
            <span class="contact-value">{APP_CONTACT.discord}</span>
          </div>
        </button>

        <button
          class="contact-card"
          on:click={() => copyToClipboard(APP_CONTACT.instagram)}
        >
          <span class="contact-icon">◉</span>
          <div class="contact-info">
            <span class="contact-label">Instagram</span>
            <span class="contact-value">@{APP_CONTACT.instagram}</span>
          </div>
        </button>
      </div>
    </section>

    {#if APP_PARTNERSHIP.enabled}
      <section class="section partnership">
        <h3>{APP_PARTNERSHIP.title}</h3>
        <p>{APP_PARTNERSHIP.description}</p>
        <button class="cta-btn" on:click={handleEmailClick}>
          {APP_PARTNERSHIP.ctaLabel}
        </button>
      </section>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 10, 10, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal {
    background: var(--color-bg-panel);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 24px 28px;
    width: 520px;
    max-width: 92vw;
    max-height: 88vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }

  .close-btn {
    position: absolute;
    top: 12px;
    right: 14px;
    background: transparent;
    border: none;
    color: var(--color-text-dim);
    font-size: 24px;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    line-height: 1;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .close-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }
  .brand-icon {
    width: 80px;
    height: 80px;
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
    padding: 4px;
    object-fit: contain;
    border: 2px solid var(--color-border);
  }
  .header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .header-text h2 {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: 0.5px;
  }
  .tagline {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
  .version {
    font-size: 11px;
    color: var(--color-accent);
    margin-top: 4px;
    font-weight: 600;
  }

  .divider {
    height: 1px;
    background: var(--color-border);
    margin: 12px -28px 16px;
  }

  .section {
    margin-bottom: 18px;
  }
  .section h3 {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-bottom: 8px;
  }
  .section p {
    font-size: 13px;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .creator-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .creator-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--color-accent);
    background: var(--color-bg-secondary);
  }
  .creator-name {
    font-size: 14px;
    color: var(--color-text-primary);
    font-weight: 600;
  }
  .creator-role {
    font-size: 12px;
    color: var(--color-text-dim);
  }

  .contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .contact-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .contact-card:hover {
    border-color: var(--color-accent);
    background: var(--color-accent-soft);
  }
  .contact-icon {
    font-size: 18px;
    color: var(--color-accent);
    width: 28px;
    text-align: center;
  }
  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow: hidden;
  }
  .contact-label {
    font-size: 10px;
    color: var(--color-text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .contact-value {
    font-size: 12px;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .partnership {
    background: var(--color-accent-soft);
    border: 1px solid var(--color-accent-dim);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    margin-top: 8px;
  }
  .partnership h3 {
    color: var(--color-accent-hover);
  }
  .partnership p {
    margin-bottom: 12px;
    color: var(--color-text-primary);
  }
  .cta-btn {
    background: var(--color-accent);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .cta-btn:hover {
    background: var(--color-accent-hover);
  }
</style>
