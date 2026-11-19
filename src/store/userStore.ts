import { create } from 'zustand';
import { UserPreferences, VoteType } from '../types';

const RANDOM_NAMES = ['Alex', 'Jordan', 'Sam', 'Riley', 'Taylor', 'Morgan', 'Casey', 'Jamie'];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

interface UserState {
  user: UserPreferences;
  setName: (name: string) => void;
  addVoteToHistory: (restaurantId: string, vote: VoteType) => void;
  reset: () => void;
}

function createDefaultUser(): UserPreferences {
  return {
    id: generateId(),
    name: RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)],
    likedCuisines: [],
    dislikedCuisines: [],
    pricePreference: [1, 2, 3],
    history: [],
  };
}

export const useUserStore = create<UserState>((set) => ({
  user: createDefaultUser(),

  setName: (name) =>
    set((state) => ({ user: { ...state.user, name } })),

  addVoteToHistory: (restaurantId, vote) =>
    set((state) => ({
      user: {
        ...state.user,
        history: [
          ...state.user.history,
          { restaurantId, vote, timestamp: Date.now() },
        ],
      },
    })),

  reset: () => set({ user: createDefaultUser() }),
}));
