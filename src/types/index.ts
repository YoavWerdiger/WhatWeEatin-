export type RestaurantSource = 'wolt' | 'tenbis' | 'google' | 'mock';

export interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  priceLevel: 1 | 2 | 3 | 4;
  cuisine: string;
  distance?: string;
  address?: string;
  isOpen?: boolean;
  source: RestaurantSource;
  deliveryFee?: string;
  minimumOrder?: string;
  slug?: string;
  externalUrl?: string;
  blurhash?: string;
}

export type VoteType = 'like' | 'dislike' | 'superlike';

export interface Vote {
  userId: string;
  restaurantId: string;
  vote: VoteType;
  timestamp: number;
}

export interface SessionUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  hasFinishedSwiping: boolean;
  votesCount: number;
  rejectCount: number;
}

export type MatchStrategy = 'consensus' | 'majority' | 'weighted';

/** How the group picks a restaurant. Default `swipe` for older sessions. */
export type GameMode = 'swipe' | 'roulette';

/** Host-triggered roulette spin — synced so guests animate to the same winner. */
export interface RouletteSpinResult {
  restaurantId: string;
  spunAt: number;
}

export interface Session {
  id: string;
  code: string;
  hostId: string;
  users: SessionUser[];
  restaurants: Restaurant[];
  votes: Record<string, Vote[]>;
  status: 'waiting' | 'swiping' | 'matched' | 'expired';
  matchStrategy: MatchStrategy;
  /** Auto-match suppressed for these IDs after "Keep browsing" until someone votes on that place again. */
  snoozedMatchRestaurantIds?: string[];
  matchedRestaurant?: Restaurant;
  /** Seconds for the swipe round; 0 = no countdown timer. */
  timerDuration: number;
  timerStartedAt?: number;
  /** Everyone must tap "Keep browsing" before the group returns to swiping. */
  requireUnanimousKeepBrowsing: boolean;
  /** User ids who tapped keep browsing for the current match (reset when a new match is set). */
  keepBrowsingApprovedBy?: string[];
  /** Host start is blocked until every player has toggled ready (when true). */
  requireLobbyReady: boolean;
  /** User ids ready in the lobby (cleared when swiping starts). */
  lobbyReadyIds?: string[];
  /** Game mode; missing on legacy docs → treat as swipe. */
  gameMode: GameMode;
  /** Latest roulette spin (host-only write); cleared when match is dismissed. */
  rouletteResult?: RouletteSpinResult;
  createdAt: number;
}

/** Options when the host creates a session (defaults applied in store). */
export interface CreateSessionOptions {
  timerDuration?: number;
  requireUnanimousKeepBrowsing?: boolean;
  requireLobbyReady?: boolean;
  gameMode?: GameMode;
}

export interface MatchResult {
  restaurant: Restaurant;
  agreedUsers: SessionUser[];
  score: number;
  strategy: MatchStrategy;
}

export interface UserPreferences {
  id: string;
  name: string;
  likedCuisines: string[];
  dislikedCuisines: string[];
  pricePreference: number[];
  history: { restaurantId: string; vote: VoteType; timestamp: number }[];
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: 'email' | 'google' | 'anonymous';
}

// ---------------------------------------------------------------------------
// Session Filters
// ---------------------------------------------------------------------------

export const CUISINE_OPTIONS = [
  { key: 'pizza', label: '🍕 פיצה', labelEn: 'Pizza' },
  { key: 'sushi', label: '🍣 סושי', labelEn: 'Sushi' },
  { key: 'burger', label: '🍔 המבורגר', labelEn: 'Burgers' },
  { key: 'asian', label: '🥡 אסייתי', labelEn: 'Asian' },
  { key: 'italian', label: '🍝 איטלקי', labelEn: 'Italian' },
  { key: 'mexican', label: '🌮 מקסיקני', labelEn: 'Mexican' },
  { key: 'indian', label: '🍛 הודי', labelEn: 'Indian' },
  { key: 'hummus', label: '🧆 חומוס/פלאפל', labelEn: 'Hummus' },
  { key: 'grill', label: '🥩 גריל/בשרים', labelEn: 'Grill' },
  { key: 'seafood', label: '🦐 דגים/פירות ים', labelEn: 'Seafood' },
  { key: 'vegan', label: '🥗 טבעוני', labelEn: 'Vegan' },
  { key: 'breakfast', label: '🥞 ארוחות בוקר', labelEn: 'Breakfast' },
  { key: 'dessert', label: '🍰 קינוחים', labelEn: 'Desserts' },
  { key: 'coffee', label: '☕ קפה', labelEn: 'Coffee' },
] as const;

export const STYLE_OPTIONS = [
  { key: 'fast', label: '⚡ מהיר', labelEn: 'Fast Food' },
  { key: 'casual', label: '🍽️ קז\'ואל', labelEn: 'Casual' },
  { key: 'premium', label: '✨ פרימיום', labelEn: 'Premium' },
] as const;

export interface SessionFilters {
  cuisines: string[];
  kosherOnly: boolean;
  maxPriceLevel: 1 | 2 | 3 | 4;
  styles: string[];
}
