<script lang="ts">
  export let label: string;
  export let value: string;
  export let options: { value: string; label: string }[];
  export let tooltip: string = "";
  export let onChange: (v: string) => void;

  function handle(e: Event) {
    onChange((e.target as HTMLSelectElement).value);
  }
</script>

<div class="ctrl">
  <span class="label" title={tooltip}>
    {label}{#if tooltip}<span class="info" title={tooltip}>?</span>{/if}
  </span>
  <select value={value} on:change={handle}>
    {#each options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>

<style>
  .ctrl { display: flex; flex-direction: column; gap: 3px; }
  .label { font-size: 11px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 4px; }
  .info {
    display: inline-flex; align-items: center; justify-content: center;
    width: 13px; height: 13px; border-radius: 50%;
    background: var(--color-border); color: var(--color-text-primary);
    font-size: 9px; cursor: help;
  }
  select {
    width: 100%; background: var(--color-bg-secondary);
    border: 1px solid var(--color-border); border-radius: var(--radius-sm);
    color: var(--color-text-primary); padding: 5px 8px; font-size: 12px;
    font-family: inherit; cursor: pointer;
  }
  select:focus { outline: none; border-color: var(--color-accent); }
</style>