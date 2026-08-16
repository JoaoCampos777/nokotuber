import { writable } from "svelte/store";

export const storeOpen = writable<boolean>(false);
export function openStore(): void { storeOpen.set(true); }
export function closeStore(): void { storeOpen.set(false); }
