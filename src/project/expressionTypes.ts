export type ExpressionSlot =
  | "neutral" | "talking" | "sad" | "angry" | "happy" | "special" | (string & {});

export type ExpressionImageSlot = "mouthClosed" | "mouthOpen" | "blinkClosed" | "blinkOpen";

export interface ExpressionImages {
  mouthClosed: string | null;
  mouthOpen:   string | null;
  blinkClosed: string | null;
  blinkOpen:   string | null;
}

export function emptyExpressionImages(): ExpressionImages {
  return { mouthClosed: null, mouthOpen: null, blinkClosed: null, blinkOpen: null };
}

export interface Expression {
  id: string;
  name: string;
  slot: ExpressionSlot;
  hotkey: string | null;
  images: ExpressionImages;
  fallbackColor: string;
  isActive: boolean;
}

export interface ExpressionSet {
  id: string;
  name: string;
  isActive: boolean;
  expressions: Expression[];
}

export interface ExpressionProjectState {
  projectName: string;
  sets: ExpressionSet[];
  activeSetId: string | null;
  activeExpressionId: string | null;
}

export const SUGGESTED_HOTKEYS: { code: string; label: string }[] = [
  { code: "Digit1", label: "1" }, { code: "Digit2", label: "2" },
  { code: "Digit3", label: "3" }, { code: "Digit4", label: "4" },
  { code: "Digit5", label: "5" }, { code: "Digit6", label: "6" },
  { code: "KeyQ", label: "Q" }, { code: "KeyW", label: "W" },
  { code: "KeyE", label: "E" }, { code: "KeyR", label: "R" },
  { code: "F1", label: "F1" }, { code: "F2", label: "F2" },
  { code: "F3", label: "F3" }, { code: "F4", label: "F4" },
];

export function hotkeyLabel(code: string | null): string {
  if (!code) return "—";
  if (code.startsWith("Digit"))  return code.slice(5);
  if (code.startsWith("Key"))    return code.slice(3);
  if (code.startsWith("Numpad")) return "Num " + code.slice(6);
  return code;
}