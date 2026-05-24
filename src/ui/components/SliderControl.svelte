<script lang="ts">
  export let label: string;
  export let value: number;
  export let min: number = 0;
  export let max: number = 100;
  export let step: number = 1;
  export let suffix: string = "";
  export let tooltip: string = "";
  export let onChange: (v: number) => void;

  function handle(e: Event) {
    onChange(parseFloat((e.target as HTMLInputElement).value));
  }
</script>

<div class="ctrl">
  <div class="row">
    <span class="label" title={tooltip}>
      {label}{#if tooltip}<span class="info" title={tooltip}>?</span>{/if}
    </span>
    <span class="value">{value}{suffix}</span>
  </div>
  <input type="range" {min} {max} {step} {value} on:input={handle} />
</div>

<style>
  .ctrl { display: flex; flex-direction: column; gap: 3px; }
  .row { display: flex; align-items: center; justify-content: space-between; }
  .label { font-size: 11px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 4px; }
  .info {
    display: inline-flex; align-items: center; justify-content: center;
    width: 13px; height: 13px; border-radius: 50%;
    background: var(--color-border); color: var(--color-text-primary);
    font-size: 9px; cursor: help;
  }
  .value { font-size: 11px; color: var(--color-text-dim); font-variant-numeric: tabular-nums; }
  input[type="range"] { width: 100%; accent-color: var(--color-accent); }
</style>