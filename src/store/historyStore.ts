import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Restaurant, RestaurantSource, SessionUser } from '../types';

/** One finished game, kept on the device for the profile page. */
export interface PastMatch {
  key: string;
  at: number;
  restaurant: Pick<Restaurant, 'id' | 'name' | 'image' | 'cuisine' | 'rating' | 'priceLevel' | 'externalUrl'> & {
    source: RestaurantSource;
  };
  players: Pick<SessionUser, 'id' | 'name' | 'avatar'>[];
  /** Tapped "order" from the match screen */
  ordered?: boolean;
  /** How it was: 1 loved it, 0 okay, -1 not again */
  rating?: -1 | 0 | 1;
}

const MAX = 60;

interface HistoryState {
  matches: PastMatch[];
  addMatch: (restaurant: Restaurant, players: SessionUser[]) => void;
  /** The latest entry for this restaurant was ordered */
  markOrdered: (restaurantId: string) => void;
  rate: (key: string, rating: -1 | 0 | 1) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      matches: [],
      addMatch: (r, players) =>
        set((state) => {
          const now = Date.now();
          // The same match screen can mount more than once (keep browsing, re-renders) — one entry per hour
          const key = `${r.id}-${Math.floor(now / 3_600_000)}`;
          if (state.matches.some((m) => m.key === key)) return state;
          const entry: PastMatch = {
            key,
            at: now,
            restaurant: {
              id: r.id,
              name: r.name,
              image: r.image,
              cuisine: r.cuisine,
              rating: r.rating,
              priceLevel: r.priceLevel,
              externalUrl: r.externalUrl,
              source: r.source,
            },
            players: players.map((u) => ({ id: u.id, name: u.name, avatar: u.avatar })),
          };
          return { matches: [entry, ...state.matches].slice(0, MAX) };
        }),
      markOrdered: (restaurantId) =>
        set((state) => {
          const i = state.matches.findIndex((m) => m.restaurant.id === restaurantId);
          if (i < 0) return state;
          const matches = [...state.matches];
          matches[i] = { ...matches[i], ordered: true };
          return { matches };
        }),
      rate: (key, rating) =>
        set((state) => ({ matches: state.matches.map((m) => (m.key === key ? { ...m, rating } : m)) })),
    }),
    { name: 'wwe-history', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
