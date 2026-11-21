import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Unsubscribe,
  deleteDoc,
  deleteField,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  Session,
  Vote,
  SessionUser,
  Restaurant,
  GameMode,
  RouletteSpinResult,
} from '../types';
import { resolveGameMode } from '../utils/constants';

const SESSIONS = 'sessions';

function getRef(code: string) {
  if (!db) throw new Error('Firebase not configured');
  return doc(db, SESSIONS, code);
}

// ---------------------------------------------------------------------------
// Firestore document shape (flat-friendly for Firestore)
// ---------------------------------------------------------------------------

interface SessionDoc {
  id: string;
  code: string;
  hostId: string;
  userIds: string[];
  users: SessionUser[];
  restaurants: Restaurant[];
  votes: Record<string, Vote[]>;
  status: Session['status'];
  matchStrategy: Session['matchStrategy'];
  snoozedMatchRestaurantIds?: string[];
  matchedRestaurant?: Restaurant;
  timerDuration: number;
  timerStartedAt?: number;
  requireUnanimousKeepBrowsing?: boolean;
  requireLobbyReady?: boolean;
  keepBrowsingApprovedBy?: string[];
  lobbyReadyIds?: string[];
  /** May still contain retired values (e.g. `blind_budget`) from older clients. */
  gameMode?: GameMode | string;
  rouletteResult?: RouletteSpinResult;
  createdAt: unknown;
}

function stripUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefinedDeep(v);
  }
  return out;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return stripUndefinedDeep(obj) as T;
}

/** Keep Firestore docs small and free of undefined nested fields. */
export function sanitizeRestaurantForFirestore(r: Restaurant): Restaurant {
  return stripUndefined({
    id: r.id,
    name: r.name,
    image: r.image,
    rating: r.rating,
    reviewCount: r.reviewCount,
    deliveryTime: r.deliveryTime,
    priceLevel: r.priceLevel,
    cuisine: r.cuisine,
    distance: r.distance,
    address: r.address,
    isOpen: r.isOpen,
    source: r.source,
    deliveryFee: r.deliveryFee,
    minimumOrder: r.minimumOrder,
    slug: r.slug,
    externalUrl: r.externalUrl,
    // Roulette map pins (guests need them too)
    lat: typeof r.lat === 'number' ? r.lat : undefined,
    lng: typeof r.lng === 'number' ? r.lng : undefined,
  }) as Restaurant;
}

function sessionToDoc(session: Session, uid: string): SessionDoc {
  return stripUndefined({
    id: session.id,
    code: session.code,
    hostId: uid,
    userIds: session.users.map((u) => u.id),
    users: session.users.map((u) => stripUndefinedDeep(u) as SessionUser),
    restaurants: session.restaurants.map((r) => sanitizeRestaurantForFirestore(r)),
    votes: session.votes,
    status: session.status,
    matchStrategy: session.matchStrategy,
    snoozedMatchRestaurantIds: session.snoozedMatchRestaurantIds?.length
      ? session.snoozedMatchRestaurantIds
      : undefined,
    matchedRestaurant: session.matchedRestaurant
      ? sanitizeRestaurantForFirestore(session.matchedRestaurant)
      : undefined,
    timerDuration: session.timerDuration,
    timerStartedAt: session.timerStartedAt,
    requireUnanimousKeepBrowsing: session.requireUnanimousKeepBrowsing,
    requireLobbyReady: session.requireLobbyReady,
    keepBrowsingApprovedBy: session.keepBrowsingApprovedBy?.length
      ? session.keepBrowsingApprovedBy
      : undefined,
    lobbyReadyIds: session.lobbyReadyIds?.length
      ? session.lobbyReadyIds
      : undefined,
    gameMode: resolveGameMode(session.gameMode),
    rouletteResult: session.rouletteResult,
    createdAt: serverTimestamp(),
  }) as unknown as SessionDoc;
}

function docToSession(data: SessionDoc): Session {
  const rawUsers = data.users || [];
  return {
    id: data.id,
    code: data.code,
    hostId: data.hostId,
    users: rawUsers.map((u) => ({
      ...u,
      /** Missing in older Firestore writes reads as falsey and broke matching. */
      isOnline: u.isOnline !== false,
    })),
    restaurants: data.restaurants || [],
    votes: data.votes || {},
    status: data.status || 'waiting',
    matchStrategy: data.matchStrategy || 'consensus',
    snoozedMatchRestaurantIds: data.snoozedMatchRestaurantIds ?? [],
    matchedRestaurant: data.matchedRestaurant,
    timerDuration: data.timerDuration ?? 120,
    timerStartedAt: data.timerStartedAt,
    requireUnanimousKeepBrowsing:
      data.requireUnanimousKeepBrowsing ?? true,
    requireLobbyReady: data.requireLobbyReady ?? true,
    keepBrowsingApprovedBy: data.keepBrowsingApprovedBy ?? [],
    lobbyReadyIds: data.lobbyReadyIds ?? [],
    gameMode: resolveGameMode(data.gameMode),
    rouletteResult: data.rouletteResult,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : (data.createdAt as number) || Date.now(),
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createFirebaseSession(
  session: Session,
  uid: string,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const ref = getRef(session.code);
    await setDoc(ref, sessionToDoc(session, uid));
  } catch (err) {
    console.warn('[Firebase] createSession failed (offline mode):', String(err));
  }
}

export async function joinFirebaseSession(
  code: string,
  user: SessionUser,
): Promise<Session | null> {
  if (!isFirebaseConfigured()) return null;

  try {
    const ref = getRef(code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as SessionDoc;
    if (data.users.find((u) => u.id === user.id)) return docToSession(data);

    await updateDoc(ref, {
      users: [...data.users, user],
      userIds: arrayUnion(user.id),
    });

    return docToSession({ ...data, users: [...data.users, user] });
  } catch (err) {
    console.warn('[Firebase] joinSession failed (offline mode):', String(err));
    return null;
  }
}

export async function submitVote(
  code: string,
  userId: string,
  vote: Vote,
): Promise<void> {
  if (!isFirebaseConfigured()) return;

  try {
    const ref = getRef(code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data() as SessionDoc;
    const userVotes = [...(data.votes[userId] || []), vote];

    await updateDoc(ref, {
      [`votes.${userId}`]: userVotes,
    });
  } catch (err) {
    console.warn('[Firebase] submitVote failed (offline mode):', String(err));
  }
}

export async function updateSessionField(
  code: string,
  fields: Partial<
    Pick<
      SessionDoc,
      | 'status'
      | 'restaurants'
      | 'timerStartedAt'
      | 'matchedRestaurant'
      | 'votes'
      | 'users'
      | 'snoozedMatchRestaurantIds'
      | 'requireUnanimousKeepBrowsing'
      | 'requireLobbyReady'
      | 'keepBrowsingApprovedBy'
      | 'lobbyReadyIds'
      | 'gameMode'
      | 'rouletteResult'
    >
  >,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const ref = getRef(code);
    const payload: Record<string, unknown> = { ...fields };
    if (fields.restaurants) {
      payload.restaurants = fields.restaurants.map((r) =>
        sanitizeRestaurantForFirestore(r),
      );
    }
    if (fields.matchedRestaurant) {
      payload.matchedRestaurant = sanitizeRestaurantForFirestore(
        fields.matchedRestaurant,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(ref, stripUndefined(payload) as any);
  } catch (err) {
    console.warn('[Firebase] updateSessionField failed (offline mode):', String(err));
  }
}

/**
 * Enter "matched" without wiping keep-browsing votes when another client already
 * synced the same restaurant (late duplicate match writes were resetting approvals).
 */
export async function syncSessionMatched(
  code: string,
  matchedRestaurant: Restaurant,
  extra?: { snoozedMatchRestaurantIds?: string[]; timerStartedAt?: number },
): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    const ref = getRef(code);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) return;
      const data = snap.data() as SessionDoc;
      const sameMatch =
        data.status === 'matched' &&
        data.matchedRestaurant?.id === matchedRestaurant.id;

      const payload: Record<string, unknown> = {
        status: 'matched',
        matchedRestaurant: sanitizeRestaurantForFirestore(matchedRestaurant),
      };
      if (extra?.snoozedMatchRestaurantIds !== undefined) {
        payload.snoozedMatchRestaurantIds = extra.snoozedMatchRestaurantIds;
      }
      if (!sameMatch) {
        payload.keepBrowsingApprovedBy = [];
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction.update(ref, payload as any);
    });
  } catch (err) {
    console.warn('[Firebase] syncSessionMatched failed:', String(err));
  }
}

/** After "Keep browsing": back to swiping, clear match, remember restaurant so auto-match won't re-fire. */
export async function dismissMatchContinueBrowsing(
  code: string,
  nextSnoozedList: string[],
  extra?: { timerStartedAt?: number },
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const ref = getRef(code);
    await updateDoc(ref, {
      status: 'swiping',
      matchedRestaurant: deleteField(),
      snoozedMatchRestaurantIds: nextSnoozedList,
      keepBrowsingApprovedBy: [],
      rouletteResult: deleteField(),
      ...(extra?.timerStartedAt !== undefined
        ? { timerStartedAt: extra.timerStartedAt }
        : {}),
    });
  } catch (err) {
    console.warn('[Firebase] dismissMatchContinueBrowsing failed:', String(err));
  }
}

export async function approveKeepBrowsingVote(
  code: string,
  userId: string,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const ref = getRef(code);
    await updateDoc(ref, {
      keepBrowsingApprovedBy: arrayUnion(userId),
    });
  } catch (err) {
    console.warn('[Firebase] approveKeepBrowsingVote failed:', String(err));
  }
}

/** Removes the player from the session doc so others get a real-time "someone left" update. */
export async function removeUserFromSessionDoc(
  code: string,
  userId: string,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const ref = getRef(code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as SessionDoc;
    const users = data.users.filter((u) => u.id !== userId);
    const lobbyReadyIds = (data.lobbyReadyIds ?? []).filter(
      (id) => id !== userId,
    );
    const keepBrowsingApprovedBy = (data.keepBrowsingApprovedBy ?? []).filter(
      (id) => id !== userId,
    );
    await updateDoc(ref, {
      users,
      userIds: arrayRemove(userId),
      [`votes.${userId}`]: deleteField(),
      lobbyReadyIds,
      keepBrowsingApprovedBy,
    });
  } catch (err) {
    console.warn('[Firebase] removeUserFromSessionDoc failed:', String(err));
  }
}

export async function deleteSession(code: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const ref = getRef(code);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[Firebase] deleteSession failed (offline mode):', String(err));
  }
}

// ---------------------------------------------------------------------------
// Real-time listener
// ---------------------------------------------------------------------------

export function subscribeToSession(
  code: string,
  callback: (session: Session) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) return () => {};

  const ref = getRef(code);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        callback(docToSession(snap.data() as SessionDoc));
      }
    },
    (error) => {
      console.warn('[Firebase] Subscription error:', error);
    },
  );
}
