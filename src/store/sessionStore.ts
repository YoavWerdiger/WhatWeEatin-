import { create } from 'zustand';
import { t } from '../i18n/t';
import {
  Session,
  SessionUser,
  Restaurant,
  Vote,
  VoteType,
  MatchResult,
  MatchStrategy,
  SessionFilters,
  CUISINE_OPTIONS,
  CreateSessionOptions,
  GameMode,
  RouletteSpinResult,
} from '../types';
import { MOCK_RESTAURANTS, generateSessionCode } from '../utils/mockData';
import {
  findMatch,
  getAIDecision,
  getMutualPositiveRestaurants,
  getPickyRanking,
} from '../utils/matching';
import { fetchAllRestaurants } from '../services/restaurants';
import {
  getCurrentLocation,
  DEFAULT_LOCATION,
  UserLocation,
  ensureIsraeliLocation,
} from '../services/location';
import {
  createFirebaseSession,
  joinFirebaseSession,
  submitVote,
  subscribeToSession,
  updateSessionField,
  dismissMatchContinueBrowsing,
  removeUserFromSessionDoc,
  approveKeepBrowsingVote,
  syncSessionMatched,
} from '../services/session';
import {
  ensureAnonymousAuth,
  isFirebaseConfigured,
  getFirebaseUid,
} from '../services/firebase';
import { SESSION } from '../utils/constants';

// ---------------------------------------------------------------------------
// Filter logic
// ---------------------------------------------------------------------------

const CUISINE_KEYWORD_MAP: Record<string, string[]> = {
  pizza: ['pizza', 'פיצה', 'pizzeria'],
  sushi: ['sushi', 'סושי', 'japanese', 'יפני'],
  burger: ['burger', 'המבורגר', 'burgers'],
  asian: ['asian', 'אסייתי', 'chinese', 'thai', 'תאילנדי', 'סיני', 'wok'],
  italian: ['italian', 'איטלקי', 'pasta', 'פסטה'],
  mexican: ['mexican', 'מקסיקני', 'burrito', 'taco'],
  indian: ['indian', 'הודי', 'curry'],
  hummus: ['hummus', 'חומוס', 'falafel', 'פלאפל', 'middle eastern', 'שווארמה', 'shawarma'],
  grill: ['grill', 'גריל', 'steak', 'סטייק', 'meat', 'בשרים', 'bbq'],
  seafood: ['seafood', 'fish', 'דגים', 'פירות ים'],
  vegan: ['vegan', 'טבעוני', 'vegetarian', 'צמחוני', 'plant'],
  breakfast: ['breakfast', 'בוקר', 'brunch', 'ברנץ'],
  dessert: ['dessert', 'קינוח', 'cake', 'עוגה', 'ice cream', 'גלידה', 'chocolate', 'bakery'],
  coffee: ['coffee', 'קפה', 'cafe', 'בית קפה'],
};

function matchesCuisineFilter(restaurant: Restaurant, selectedCuisines: string[]): boolean {
  if (selectedCuisines.length === 0) return true;

  const name = restaurant.name.toLowerCase();
  const cuisine = restaurant.cuisine.toLowerCase();
  const combined = `${name} ${cuisine}`;

  return selectedCuisines.some((key) => {
    const keywords = CUISINE_KEYWORD_MAP[key] || [key];
    return keywords.some((kw) => combined.includes(kw.toLowerCase()));
  });
}

function applyFilters(restaurants: Restaurant[], filters: SessionFilters): Restaurant[] {
  let result = restaurants;

  if (filters.cuisines.length > 0) {
    result = result.filter((r) => matchesCuisineFilter(r, filters.cuisines));
  }

  if (filters.maxPriceLevel < 4) {
    result = result.filter((r) => r.priceLevel <= filters.maxPriceLevel);
  }

  if (filters.kosherOnly) {
    result = result.filter((r) => {
      const name = r.name.toLowerCase();
      const cuisine = r.cuisine.toLowerCase();
      return name.includes('כשר') || name.includes('kosher') ||
             cuisine.includes('כשר') || cuisine.includes('kosher');
    });
  }

  // If filters are too restrictive, keep at least 10 restaurants
  if (result.length < 10 && restaurants.length >= 10) {
    console.log(`[Filters] Only ${result.length} results, relaxing to show more`);
    return restaurants.slice(0, Math.max(result.length * 3, 30));
  }

  return result;
}

type Unsubscribe = () => void;

interface SessionState {
  session: Session | null;
  currentCardIndex: number;
  matchResult: MatchResult | null;
  isTimerRunning: boolean;
  timeRemaining: number;
  isLoadingRestaurants: boolean;
  userLocation: UserLocation | null;
  loadError: string | null;
  firebaseUid: string | null;
  isOnline: boolean;

  initAuth: () => Promise<void>;
  createSession: (
    hostId: string,
    hostName: string,
    options?: CreateSessionOptions,
  ) => string;
  loadRestaurants: (filters?: SessionFilters) => Promise<void>;
  joinSession: (code: string, userId: string, userName: string) => boolean;
  joinRemoteSession: (
    code: string,
    userId: string,
    userName: string,
  ) => Promise<boolean>;
  startSwiping: () => void;
  /** Host-only: pick a restaurant and sync so the group sees the same roulette winner. */
  spinRoulette: () => Restaurant | null;
  /** After the reel lands, lock in the spun restaurant as the match. */
  confirmRouletteMatch: () => void;
  castVote: (userId: string, restaurantId: string, vote: VoteType) => void;
  nextCard: (finishedUserId?: string) => void;
  checkForMatch: () => MatchResult | null;
  /** After everyone swiped: pick one restaurant from the mutual-like shortlist. */
  confirmMutualMatch: (restaurant: Restaurant) => void;
  /** Register this user's wish to keep browsing; dismisses when rules are satisfied. */
  approveKeepBrowsing: (userId: string) => void;
  finalizeKeepBrowsingIfComplete: () => void;
  toggleLobbyReady: (userId: string) => void;
  triggerAIDecision: () => MatchResult | null;
  setMatchResult: (result: MatchResult) => void;
  startTimer: () => void;
  tickTimer: () => void;
  updateUserOnlineStatus: (userId: string, isOnline: boolean) => void;
  addBotVotes: () => void;
  getPickyRanking: () => { user: SessionUser; rejectRate: number }[];
  leaveSession: (explicitUserId?: string) => void;
  /** Shown once when the Firestore `users` list shrinks (someone else left). */
  participantNotice: string | null;
  clearParticipantNotice: () => void;

  _unsubscribe: Unsubscribe | null;
  _syncToFirebase: (fields: Partial<Session>) => void;
}

/** Wall-clock remaining seconds from session timer fields. */
function computeTimeRemaining(
  timerDuration: number,
  timerStartedAt: number | undefined,
  now = Date.now(),
): number {
  if (timerDuration <= 0 || !timerStartedAt) return 0;
  const elapsed = Math.floor((now - timerStartedAt) / 1000);
  return Math.max(0, timerDuration - elapsed);
}

function timerPatchForSession(
  session: Session,
  opts?: { pause?: boolean },
): Pick<SessionState, 'isTimerRunning' | 'timeRemaining'> {
  if (session.timerDuration <= 0) {
    return { isTimerRunning: false, timeRemaining: 0 };
  }
  if (
    session.status === 'swiping' &&
    session.timerStartedAt &&
    !opts?.pause
  ) {
    const remaining = computeTimeRemaining(
      session.timerDuration,
      session.timerStartedAt,
    );
    return { isTimerRunning: remaining > 0, timeRemaining: remaining };
  }
  return {
    isTimerRunning: false,
    timeRemaining: session.timerStartedAt
      ? computeTimeRemaining(session.timerDuration, session.timerStartedAt)
      : session.timerDuration,
  };
}

function matchResultFromSession(next: Session): MatchResult {
  const restaurant = next.matchedRestaurant!;
  const agreedUsers = next.users.filter((u) => {
    const userVotes = next.votes[u.id] || [];
    return userVotes.some(
      (v) =>
        v.restaurantId === restaurant.id &&
        (v.vote === 'like' || v.vote === 'superlike'),
    );
  });
  return {
    restaurant,
    agreedUsers,
    score: 1,
    strategy: next.matchStrategy,
  };
}

function buildParticipantLeftMessage(
  leavers: SessionUser[],
  hostId: string,
  remainingCount: number,
): string {
  if (remainingCount === 0) {
    return t('participant.empty');
  }

  const label = (u: SessionUser) =>
    u.id === hostId ? t('participant.hostTag', { name: u.name }) : u.name;

  let msg: string;
  if (leavers.length === 1) {
    msg = t('participant.singleLeft', { name: label(leavers[0]!) });
  } else {
    msg = t('participant.multiLeft', {
      names: leavers.map(label).join(', '),
    });
  }

  if (remainingCount === 1) {
    msg += t('participant.soloSuffix');
  }

  return msg;
}

function mergeGameModeFromLocal(
  prev: Session | null,
  next: Session,
): Session {
  if (
    prev &&
    prev.code === next.code &&
    prev.gameMode !== 'swipe' &&
    next.gameMode === 'swipe'
  ) {
    return { ...next, gameMode: prev.gameMode };
  }
  return next;
}

function applyRemoteSessionUpdate(
  getState: () => SessionState,
  updated: Session,
): Partial<SessionState> {
  const prev = getState().session;
  let next = mergeGameModeFromLocal(prev, updated);

  // Don't wipe a local deck if Firestore still has [] (failed / pending sync).
  if (
    prev &&
    prev.code === next.code &&
    prev.restaurants.length > 0 &&
    next.restaurants.length === 0
  ) {
    next = { ...next, restaurants: prev.restaurants };
  }

  // Re-apply after restaurant merge — spreading `updated` above used to reset gameMode.
  next = mergeGameModeFromLocal(prev, next);

  if (__DEV__ && prev && prev.gameMode !== next.gameMode) {
    console.log(
      `[session] gameMode ${prev.gameMode} → ${next.gameMode} (remote=${updated.gameMode})`,
    );
  }

  const patch: Partial<SessionState> = { session: next };

  if (
    prev &&
    prev.code === next.code &&
    next.users.length < prev.users.length
  ) {
    const nextIds = new Set(next.users.map((u) => u.id));
    const leavers = prev.users.filter((u) => !nextIds.has(u.id));
    if (leavers.length > 0) {
      patch.participantNotice = buildParticipantLeftMessage(
        leavers,
        prev.hostId,
        next.users.length,
      );
    }
  }

  // Stale remote snapshots with [] must not wipe optimistic / peer keep-browsing votes.
  if (
    prev &&
    prev.code === next.code &&
    prev.status === 'matched' &&
    next.status === 'matched' &&
    prev.matchedRestaurant?.id &&
    prev.matchedRestaurant.id === next.matchedRestaurant?.id
  ) {
    const merged = Array.from(
      new Set([
        ...(prev.keepBrowsingApprovedBy ?? []),
        ...(next.keepBrowsingApprovedBy ?? []),
      ]),
    );
    next = { ...next, keepBrowsingApprovedBy: merged };
    patch.session = next;
  }

  if (
    (next.status === 'matched' || next.status === 'expired') &&
    next.matchedRestaurant
  ) {
    const current = getState().matchResult;
    if (
      !current ||
      current.restaurant.id !== next.matchedRestaurant.id
    ) {
      patch.matchResult = matchResultFromSession(next);
    }
    const prevStatus = prev?.status;
    if (prevStatus === 'swiping' || getState().isTimerRunning) {
      Object.assign(
        patch,
        timerPatchForSession(next, { pause: true }),
      );
      // Freeze remaining at the moment we leave swiping (wall clock would keep draining).
      if (prev?.timerStartedAt && prev.timerDuration > 0) {
        patch.timeRemaining = computeTimeRemaining(
          prev.timerDuration,
          prev.timerStartedAt,
        );
      }
      patch.isTimerRunning = false;
    } else {
      patch.isTimerRunning = false;
    }
  } else if (next.status === 'waiting') {
    patch.matchResult = null;
    Object.assign(patch, timerPatchForSession(next, { pause: true }));
  } else if (
    next.status === 'swiping' &&
    !next.matchedRestaurant &&
    getState().matchResult &&
    (next.snoozedMatchRestaurantIds ?? []).includes(
      getState().matchResult!.restaurant.id,
    )
  ) {
    /** Remote "Keep browsing" — same restaurant was snoozed so auto-match won't repeat. */
    patch.matchResult = null;
    Object.assign(patch, timerPatchForSession(next));
  } else if (next.status === 'swiping' && next.timerDuration > 0) {
    Object.assign(patch, timerPatchForSession(next));
  }

  next = mergeGameModeFromLocal(prev, next);
  patch.session = next;

  return patch;
}

function dismissKeepBrowsingCore(
  get: () => SessionState,
  set: (partial: Partial<SessionState>) => void,
) {
  const session = get().session;
  const matchResult = get().matchResult;
  if (!session || !matchResult) return;
  const rid = matchResult.restaurant.id;
  const prev = session.snoozedMatchRestaurantIds ?? [];
  const nextSnoozed = prev.includes(rid) ? prev : [...prev, rid];

  const frozenRemaining = get().timeRemaining;
  const resumeTimer =
    session.timerDuration > 0 && frozenRemaining > 0;
  const now = Date.now();
  const timerStartedAt = resumeTimer
    ? now - (session.timerDuration - frozenRemaining) * 1000
    : session.timerStartedAt;

  set({
    matchResult: null,
    isTimerRunning: resumeTimer,
    timeRemaining: resumeTimer ? frozenRemaining : 0,
    session: {
      ...session,
      status: 'swiping',
      matchedRestaurant: undefined,
      snoozedMatchRestaurantIds: nextSnoozed,
      keepBrowsingApprovedBy: [],
      rouletteResult: undefined,
      ...(resumeTimer ? { timerStartedAt } : {}),
    },
  });
  void dismissMatchContinueBrowsing(session.code, nextSnoozed, {
    timerStartedAt: resumeTimer ? timerStartedAt : undefined,
  });
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  currentCardIndex: 0,
  matchResult: null,
  participantNotice: null,
  isTimerRunning: false,
  timeRemaining: SESSION.DEFAULT_TIMER,
  isLoadingRestaurants: false,
  userLocation: null,
  loadError: null,
  firebaseUid: null,
  isOnline: false,
  _unsubscribe: null,

  // ------------------------------------------------------------------
  // Auth
  // ------------------------------------------------------------------

  initAuth: async () => {
    if (!isFirebaseConfigured()) {
      set({ isOnline: false });
      return;
    }
    const user = await ensureAnonymousAuth();
    set({ firebaseUid: user?.uid ?? null, isOnline: !!user });
  },

  // ------------------------------------------------------------------
  // Internal: push partial updates to Firestore
  // ------------------------------------------------------------------

  _syncToFirebase: (fields) => {
    const { session } = get();
    if (!session || !isFirebaseConfigured()) return;
    updateSessionField(session.code, fields).catch((err) =>
      console.warn('[syncToFirebase]', err),
    );
  },

  // ------------------------------------------------------------------
  // Session lifecycle
  // ------------------------------------------------------------------

  createSession: (hostId, hostName, options) => {
    // Clean up previous subscription
    get()._unsubscribe?.();

    const code = generateSessionCode();
    const uid = getFirebaseUid() || hostId;

    const timerDuration =
      options?.timerDuration !== undefined
        ? options.timerDuration
        : SESSION.DEFAULT_TIMER;
    const requireUnanimousKeepBrowsing =
      options?.requireUnanimousKeepBrowsing !== undefined
        ? options.requireUnanimousKeepBrowsing
        : true;
    const requireLobbyReady =
      options?.requireLobbyReady !== undefined
        ? options.requireLobbyReady
        : true;
    const gameMode: GameMode = options?.gameMode ?? 'swipe';

    const host: SessionUser = {
      id: uid,
      name: hostName,
      isOnline: true,
      hasFinishedSwiping: false,
      votesCount: 0,
      rejectCount: 0,
    };

    const session: Session = {
      id: Math.random().toString(36).slice(2, 10),
      code,
      hostId: uid,
      users: [host],
      restaurants: [],
      votes: {},
      status: 'waiting',
      matchStrategy: 'consensus',
      timerDuration,
      requireUnanimousKeepBrowsing,
      requireLobbyReady,
      gameMode,
      keepBrowsingApprovedBy: [],
      lobbyReadyIds: [],
      createdAt: Date.now(),
    };

    set({
      session,
      currentCardIndex: 0,
      matchResult: null,
      timeRemaining: timerDuration > 0 ? timerDuration : 0,
      loadError: null,
      _unsubscribe: null,
    });

    if (__DEV__) {
      console.log('[createSession] gameMode=', gameMode, 'code=', code);
    }

    // Push to Firestore, then subscribe so the host sees real players joining
    if (isFirebaseConfigured()) {
      void createFirebaseSession(session, uid).then(() => {
        const unsub = subscribeToSession(code, (updated) => {
          set(applyRemoteSessionUpdate(get, updated));
        });
        set({ _unsubscribe: unsub });
      });
    }

    return code;
  },

  loadRestaurants: async (filters) => {
    set({ isLoadingRestaurants: true, loadError: null });

    try {
      const rawLocation = await getCurrentLocation();
      const loc = ensureIsraeliLocation(rawLocation);
      console.log('[loadRestaurants] Location:', JSON.stringify(loc));
      set({ userLocation: loc });

      let restaurants = await fetchAllRestaurants(
        loc.latitude,
        loc.longitude,
        loc.city,
      );

      if (filters) {
        restaurants = applyFilters(restaurants, filters);
        console.log(`[loadRestaurants] After filters: ${restaurants.length}`);
      }

      // Shuffle + cap so swipe deck and Firestore stay manageable
      restaurants = [...restaurants]
        .sort(() => Math.random() - 0.5)
        .slice(0, SESSION.MAX_RESTAURANTS);
      console.log(`[loadRestaurants] Deck size: ${restaurants.length}`);

      const { session } = get();
      if (session) {
        const updated = { ...session, restaurants };
        set({ session: updated, isLoadingRestaurants: false });
        get()._syncToFirebase({
          restaurants,
          gameMode: updated.gameMode,
        });
      } else {
        set({ isLoadingRestaurants: false });
      }
    } catch (error) {
      console.warn('[loadRestaurants] Error:', error);
      const fallback = [...MOCK_RESTAURANTS]
        .sort(() => Math.random() - 0.5)
        .slice(0, SESSION.MAX_RESTAURANTS);
      const { session } = get();
      if (session) {
        set({
          session: { ...session, restaurants: fallback },
          isLoadingRestaurants: false,
          loadError: 'Could not fetch restaurants. Using sample data.',
          userLocation: DEFAULT_LOCATION,
        });
        get()._syncToFirebase({
          restaurants: fallback,
          gameMode: session.gameMode,
        });
      } else {
        set({
          isLoadingRestaurants: false,
          loadError: 'Failed to load restaurants.',
        });
      }
    }
  },

  joinSession: (code, userId, userName) => {
    const { session } = get();
    if (!session || session.code !== code) return false;
    if (session.users.length >= SESSION.MAX_USERS) return false;
    if (session.users.find((u) => u.id === userId)) return true;

    const newUser: SessionUser = {
      id: userId,
      name: userName,
      isOnline: true,
      hasFinishedSwiping: false,
      votesCount: 0,
      rejectCount: 0,
    };

    const updatedUsers = [...session.users, newUser];
    set({ session: { ...session, users: updatedUsers } });
    get()._syncToFirebase({ users: updatedUsers } as Partial<Session>);
    return true;
  },

  joinRemoteSession: async (code, userId, userName) => {
    if (!isFirebaseConfigured()) return false;

    const uid = getFirebaseUid() || userId;
    const user: SessionUser = {
      id: uid,
      name: userName,
      isOnline: true,
      hasFinishedSwiping: false,
      votesCount: 0,
      rejectCount: 0,
    };

    const remoteSession = await joinFirebaseSession(code, user);
    if (!remoteSession) return false;

    // Subscribe to real-time updates
    const unsub = subscribeToSession(code, (updated) => {
      set(applyRemoteSessionUpdate(get, updated));
    });

    set({
      session: remoteSession,
      currentCardIndex: 0,
      matchResult: null,
      _unsubscribe: unsub,
      ...timerPatchForSession(remoteSession),
    });

    return true;
  },

  startSwiping: () => {
    const { session } = get();
    if (!session) return;

    const uid = getFirebaseUid();
    if (uid && session.hostId !== uid) {
      console.warn('[startSwiping] Only the host can start the game');
      return;
    }

    if (session.requireLobbyReady) {
      const ready = new Set(session.lobbyReadyIds ?? []);
      const allReady = session.users.every((u) => ready.has(u.id));
      if (!allReady) {
        console.warn('[startSwiping] Waiting for all players to tap Ready');
        return;
      }
    }

    get().addBotVotes();

    const now = Date.now();
    const useTimer = session.timerDuration > 0;
    set({
      session: {
        ...session,
        status: 'swiping',
        timerStartedAt: now,
        lobbyReadyIds: [],
      },
      isTimerRunning: useTimer,
      currentCardIndex: 0,
      timeRemaining: useTimer ? session.timerDuration : 0,
    });

    get()._syncToFirebase({
      status: 'swiping',
      timerStartedAt: now,
      lobbyReadyIds: [],
      gameMode: session.gameMode,
    });

    // Start listening for remote updates if online
    if (isFirebaseConfigured() && !get()._unsubscribe) {
      const unsub = subscribeToSession(session.code, (updated) => {
        set(applyRemoteSessionUpdate(get, updated));
      });
      set({ _unsubscribe: unsub });
    }
  },

  spinRoulette: () => {
    const { session } = get();
    if (!session || session.restaurants.length === 0) return null;

    const uid = getFirebaseUid();
    if (uid && session.hostId !== uid) {
      console.warn('[spinRoulette] Only the host can spin');
      return null;
    }

    const pick =
      session.restaurants[
        Math.floor(Math.random() * session.restaurants.length)
      ]!;
    const rouletteResult: RouletteSpinResult = {
      restaurantId: pick.id,
      spunAt: Date.now(),
    };

    set({
      session: { ...session, rouletteResult },
    });
    get()._syncToFirebase({ rouletteResult });
    return pick;
  },

  confirmRouletteMatch: () => {
    const { session } = get();
    if (!session?.rouletteResult) return;
    if (session.status === 'matched' || session.status === 'expired') return;

    const restaurant = session.restaurants.find(
      (r) => r.id === session.rouletteResult!.restaurantId,
    );
    if (!restaurant) return;

    const result: MatchResult = {
      restaurant,
      agreedUsers: session.users,
      score: 1,
      strategy: session.matchStrategy,
    };

    set({
      matchResult: result,
      session: {
        ...session,
        status: 'matched',
        matchedRestaurant: restaurant,
        keepBrowsingApprovedBy: [],
      },
      isTimerRunning: false,
      timeRemaining:
        session.timerDuration > 0 && session.timerStartedAt
          ? computeTimeRemaining(
              session.timerDuration,
              session.timerStartedAt,
            )
          : get().timeRemaining,
    });
    void syncSessionMatched(session.code, restaurant);
  },

  castVote: (userId, restaurantId, vote) => {
    const { session } = get();
    if (!session) return;

    const newVote: Vote = { userId, restaurantId, vote, timestamp: Date.now() };
    const userVotes = [...(session.votes[userId] || []), newVote];
    const updatedVotes = { ...session.votes, [userId]: userVotes };

    const updatedUsers = session.users.map((u) =>
      u.id === userId
        ? {
            ...u,
            votesCount: u.votesCount + 1,
            rejectCount:
              vote === 'dislike' ? u.rejectCount + 1 : u.rejectCount,
          }
        : u,
    );

    const snoozed = session.snoozedMatchRestaurantIds ?? [];
    const nextSnoozed = snoozed.filter((id) => id !== restaurantId);
    const snoozeChanged = nextSnoozed.length !== snoozed.length;

    set({
      session: {
        ...session,
        votes: updatedVotes,
        users: updatedUsers,
        ...(snoozeChanged
          ? {
              snoozedMatchRestaurantIds:
                nextSnoozed.length > 0 ? nextSnoozed : undefined,
            }
          : {}),
      },
    });

    // Push vote to Firestore
    if (isFirebaseConfigured() && session.code) {
      submitVote(session.code, userId, newVote).catch((err) =>
        console.warn('[castVote] Firebase push failed:', err),
      );
      if (snoozeChanged) {
        updateSessionField(session.code, {
          snoozedMatchRestaurantIds: nextSnoozed,
        }).catch((err) =>
          console.warn('[castVote] snooze sync failed:', err),
        );
      }
    }
  },

  nextCard: (finishedUserIdParam) => {
    const { currentCardIndex, session } = get();
    if (!session) return;

    const finishedUserId =
      finishedUserIdParam ??
      getFirebaseUid() ??
      session.hostId;
    const nextIndex = currentCardIndex + 1;
    if (nextIndex >= session.restaurants.length) {
      const updatedUsers = session.users.map((u) =>
        u.id === finishedUserId ? { ...u, hasFinishedSwiping: true } : u,
      );
      set({
        currentCardIndex: nextIndex,
        session: { ...session, users: updatedUsers },
      });
    } else {
      set({ currentCardIndex: nextIndex });
    }
  },

  checkForMatch: () => {
    const { session } = get();
    if (!session || session.status === 'matched') return null;

    const exclude = session.snoozedMatchRestaurantIds ?? [];
    const result = findMatch(
      session.restaurants,
      session.votes,
      session.users,
      session.matchStrategy,
      exclude,
    );

    if (result) {
      set({
        matchResult: result,
        session: {
          ...session,
          status: 'matched',
          matchedRestaurant: result.restaurant,
          keepBrowsingApprovedBy: [],
        },
        isTimerRunning: false,
        timeRemaining:
          session.timerDuration > 0 && session.timerStartedAt
            ? computeTimeRemaining(
                session.timerDuration,
                session.timerStartedAt,
              )
            : get().timeRemaining,
      });
      void syncSessionMatched(session.code, result.restaurant);
    }

    return result;
  },

  finalizeKeepBrowsingIfComplete: () => {
    const { session, matchResult } = get();
    if (!session || !matchResult) return;
    if (session.status !== 'matched' && session.status !== 'expired') return;
    if (!session.requireUnanimousKeepBrowsing) return;
    const approved = new Set(session.keepBrowsingApprovedBy ?? []);
    if (!session.users.every((u) => approved.has(u.id))) return;
    dismissKeepBrowsingCore(get, set);
  },

  approveKeepBrowsing: (userId) => {
    const { session, matchResult } = get();
    if (!session || !matchResult) return;
    if (session.status !== 'matched' && session.status !== 'expired') return;

    // Prefer the id that exists on the session roster (Firebase uid vs local fallback).
    const rosterId =
      session.users.find((u) => u.id === userId)?.id ??
      session.users.find(
        (u) =>
          u.id === getFirebaseUid() ||
          u.id === get().firebaseUid,
      )?.id ??
      userId;

    if (!session.requireUnanimousKeepBrowsing) {
      dismissKeepBrowsingCore(get, set);
      return;
    }

    if ((session.keepBrowsingApprovedBy ?? []).includes(rosterId)) {
      get().finalizeKeepBrowsingIfComplete();
      return;
    }

    const next = [...(session.keepBrowsingApprovedBy ?? []), rosterId];
    set({
      session: { ...session, keepBrowsingApprovedBy: next },
    });

    if (isFirebaseConfigured()) {
      void approveKeepBrowsingVote(session.code, rosterId);
    }

    get().finalizeKeepBrowsingIfComplete();
  },

  toggleLobbyReady: (userId) => {
    const { session } = get();
    if (!session) return;
    const ids = [...(session.lobbyReadyIds ?? [])];
    const idx = ids.indexOf(userId);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(userId);
    set({ session: { ...session, lobbyReadyIds: ids } });
    get()._syncToFirebase({ lobbyReadyIds: ids });
  },

  confirmMutualMatch: (restaurant) => {
    const { session } = get();
    if (!session || session.status === 'matched') return;

    const mutual = getMutualPositiveRestaurants(
      session.restaurants,
      session.votes,
      session.users,
    );
    if (!mutual.some((r) => r.id === restaurant.id)) return;

    const nextSnoozed = (session.snoozedMatchRestaurantIds ?? []).filter(
      (id) => id !== restaurant.id,
    );

    const agreedUsers = session.users.filter((u) => {
      const userVotes = session.votes[u.id] || [];
      return userVotes.some(
        (v) =>
          v.restaurantId === restaurant.id &&
          (v.vote === 'like' || v.vote === 'superlike'),
      );
    });

    const result: MatchResult = {
      restaurant,
      agreedUsers,
      score: agreedUsers.length,
      strategy: session.matchStrategy,
    };

    set({
      matchResult: result,
      session: {
        ...session,
        status: 'matched',
        matchedRestaurant: restaurant,
        snoozedMatchRestaurantIds:
          nextSnoozed.length > 0 ? nextSnoozed : undefined,
        keepBrowsingApprovedBy: [],
      },
      isTimerRunning: false,
        timeRemaining:
          session.timerDuration > 0 && session.timerStartedAt
            ? computeTimeRemaining(
                session.timerDuration,
                session.timerStartedAt,
              )
            : get().timeRemaining,
    });
    void syncSessionMatched(session.code, restaurant, {
      snoozedMatchRestaurantIds: nextSnoozed,
    });
  },

  triggerAIDecision: () => {
    const { session } = get();
    if (!session) throw new Error('No active session');

    const result = getAIDecision(
      session.restaurants,
      session.votes,
      session.users,
    );
    if (!result) {
      console.warn('[triggerAIDecision] No restaurants available to pick from');
      return null;
    }

    set({
      matchResult: result,
      session: {
        ...session,
        status: 'matched',
        matchedRestaurant: result.restaurant,
        keepBrowsingApprovedBy: [],
      },
      isTimerRunning: false,
        timeRemaining:
          session.timerDuration > 0 && session.timerStartedAt
            ? computeTimeRemaining(
                session.timerDuration,
                session.timerStartedAt,
              )
            : get().timeRemaining,
    });
    void syncSessionMatched(session.code, result.restaurant);

    return result;
  },

  setMatchResult: (result) => set({ matchResult: result }),

  startTimer: () => {
    const { session } = get();
    if (!session) return;
    const now = Date.now();
    set({
      isTimerRunning: true,
      timeRemaining: session.timerDuration,
      session: { ...session, timerStartedAt: now },
    });
  },

  tickTimer: () => {
    const { isTimerRunning, session, matchResult } = get();
    if (!isTimerRunning || !session || matchResult) return;
    if (session.timerDuration <= 0 || !session.timerStartedAt) return;

    const remaining = computeTimeRemaining(
      session.timerDuration,
      session.timerStartedAt,
    );

    if (remaining <= 0) {
      if (session.status !== 'swiping') {
        set({ timeRemaining: 0, isTimerRunning: false });
        return;
      }

      const result = getAIDecision(
        session.restaurants,
        session.votes,
        session.users,
      );
      if (!result) {
        set({ timeRemaining: 0, isTimerRunning: false });
        return;
      }

      set({
        timeRemaining: 0,
        isTimerRunning: false,
        matchResult: result,
        session: {
          ...session,
          status: 'expired',
          matchedRestaurant: result.restaurant,
        },
      });

      const uid = getFirebaseUid();
      if (!uid || uid === session.hostId) {
        get()._syncToFirebase({
          status: 'expired',
          matchedRestaurant: result.restaurant,
        });
      }
    } else if (remaining !== get().timeRemaining) {
      set({ timeRemaining: remaining });
    }
  },

  updateUserOnlineStatus: (userId, isOnline) => {
    const { session } = get();
    if (!session) return;

    const updatedUsers = session.users.map((u) =>
      u.id === userId ? { ...u, isOnline } : u,
    );
    set({ session: { ...session, users: updatedUsers } });
    get()._syncToFirebase({ users: updatedUsers } as Partial<Session>);
  },

  addBotVotes: () => {
    const { session } = get();
    if (!session) return;

    const botUsers = session.users.filter((u) => u.id !== session.hostId);
    const updatedVotes = { ...session.votes };

    for (const bot of botUsers) {
      const votes: Vote[] = session.restaurants.map((r) => {
        const rand = Math.random();
        let vote: VoteType;
        if (rand < 0.15) vote = 'superlike';
        else if (rand < 0.6) vote = 'like';
        else vote = 'dislike';

        return {
          userId: bot.id,
          restaurantId: r.id,
          vote,
          timestamp: Date.now(),
        };
      });
      updatedVotes[bot.id] = votes;
    }

    set({ session: { ...session, votes: updatedVotes } });
  },

  getPickyRanking: () => {
    const { session } = get();
    if (!session) return [];
    return getPickyRanking(session.users, session.votes);
  },

  clearParticipantNotice: () => set({ participantNotice: null }),

  leaveSession: (explicitUserId) => {
    const { session } = get();
    const uid =
      getFirebaseUid() ?? get().firebaseUid ?? explicitUserId ?? undefined;
    if (session?.code && uid && isFirebaseConfigured()) {
      void removeUserFromSessionDoc(session.code, uid);
    }

    get()._unsubscribe?.();
    set({
      session: null,
      currentCardIndex: 0,
      matchResult: null,
      participantNotice: null,
      isTimerRunning: false,
      timeRemaining: SESSION.DEFAULT_TIMER,
      _unsubscribe: null,
    });
  },
}));
