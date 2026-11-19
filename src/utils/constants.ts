import type { GameMode } from '../types';

export const APP_NAME = "What We Eatin'";

/**
 * Normalize Firestore / legacy `gameMode` values.
 * Missing, unknown, or retired modes (e.g. `blind_budget`) → swipe.
 */
export function resolveGameMode(mode: GameMode | string | undefined): GameMode {
  if (mode === 'roulette') return 'roulette';
  return 'swipe';
}

/** Play screen for a session mode. */
export function getPlayRouteForGameMode(
  mode: GameMode | string | undefined,
): '/session/swipe' | '/session/roulette' {
  return resolveGameMode(mode) === 'roulette' ? '/session/roulette' : '/session/swipe';
}

export const SESSION = {
  MIN_USERS: 2,
  MAX_USERS: 10,
  CODE_LENGTH: 6,
  DEFAULT_TIMER: 120,
  /** Cap deck size so Firestore sync stays under doc limits. */
  MAX_RESTAURANTS: 40,
  /** Distance (px) before a directional commit registers. */
  SWIPE_THRESHOLD: 108,
  /** Fling velocity that can commit without full travel. */
  SWIPE_VELOCITY_THRESHOLD: 850,
  /** Soft visual tilt while dragging — keep low to avoid messy angles. */
  MAX_CARD_ROTATION: 8,
  CARD_STACK_SIZE: 3,
} as const;

export const ANIMATION = {
  CARD_SPRING: { damping: 18, stiffness: 220, mass: 0.7 },
  /** Snappy settle when the gesture does not pass threshold. */
  CARD_SNAP_BACK: {
    damping: 24,
    stiffness: 420,
    mass: 0.55,
    overshootClamping: true,
  },
  MATCH_DURATION: 2000,
  CONFETTI_COUNT: 50,
} as const;

export const PRICE_LABELS: Record<number, string> = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
};

/** Round-timer chip values in seconds (0 = off). Exported for Create Session UI. */
export const TIMER_OPTION_VALUES = [0, 60, 90, 120, 180] as const;

/** Display label for a timer chip (non-zero), e.g. 90 → "1:30". */
export function formatTimerChipLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Short labels for restaurant delivery sources (badges). */
export const SOURCE_LABELS = {
  wolt: 'Wolt',
  tenbis: '10bis',
  google: 'Google',
  mock: 'Order Now',
} as const;
