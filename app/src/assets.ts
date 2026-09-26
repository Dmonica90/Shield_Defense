/**
 * Paths into `public/assets`. The nine interface sounds carried over from the
 * base project are generic (clicks, alerts, a success sting); there is no
 * artwork yet — scenes are drawn in CSS until Clip's own art arrives.
 */
const audio = (name: string) => `${import.meta.env.BASE_URL}assets/audio/${name}`;

export const SFX = {
  click: audio('ui-click.mp3'),
  select: audio('ui-select.mp3'),
  open: audio('ui-open.mp3'),
  confirm: audio('ui-confirm.mp3'),
  notification: audio('sfx-notification.mp3'),
  alert: audio('sfx-alert.mp3'),
  /** A short, heavy sting: used when a fragment is revealed as false. */
  fired: audio('sfx-fired.mp3'),
  /** The longer sting: the protocol activating. */
  day: audio('sfx-day.mp3'),
  lose: audio('sfx-lose.mp3'),
} as const;

export type SfxName = keyof typeof SFX;

/**
 * The 90-second intro video from the design. It is not produced yet; drop the
 * file at `public/assets/video/intro.mp4` and the intro plays it, falling back
 * to the animated narration when it is missing or fails to load.
 */
export const INTRO_VIDEO = `${import.meta.env.BASE_URL}assets/video/intro.mp4`;
