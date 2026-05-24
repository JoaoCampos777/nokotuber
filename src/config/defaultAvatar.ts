/**
 * Imagens do PNGTuber padrão exibido na primeira abertura do app.
 * Para trocar o avatar padrão, substitua os PNGs em src/assets/default-avatar/.
 */

import idleUrl         from "../assets/default-avatar/idle.png?url";
import talkingUrl      from "../assets/default-avatar/talking.png?url";
import blinkUrl        from "../assets/default-avatar/blink.png?url";
import blinkTalkingUrl from "../assets/default-avatar/blink-talking.png?url";
import iconUrl         from "../assets/icon.png?url";
import creatorUrl      from "../assets/creator.png?url";

export const DEFAULT_AVATAR = {
  mouthClosed: idleUrl,
  mouthOpen:   talkingUrl,
  blinkClosed: blinkUrl,
  blinkOpen:   blinkTalkingUrl,
} as const;

export const APP_ICON_URL       = iconUrl;
export const CREATOR_AVATAR_URL = creatorUrl;