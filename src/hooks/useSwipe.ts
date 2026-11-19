import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useUserStore } from '../store/userStore';
import { getFirebaseUid } from '../services/firebase';
import { Restaurant, VoteType } from '../types';

export function useSwipe() {
  const { user } = useUserStore();
  const { addVoteToHistory } = useUserStore();
  const firebaseUid = useSessionStore((s) => s.firebaseUid);
  const {
    session,
    currentCardIndex,
    castVote,
    nextCard,
    checkForMatch,
  } = useSessionStore();

  const participantId = getFirebaseUid() ?? firebaseUid ?? user.id;

  const handleSwipe = useCallback(
    (restaurant: Restaurant, direction: VoteType) => {
      castVote(participantId, restaurant.id, direction);
      addVoteToHistory(restaurant.id, direction);
      nextCard(participantId);
      return checkForMatch();
    },
    [participantId, castVote, addVoteToHistory, nextCard, checkForMatch],
  );

  const currentRestaurant = session?.restaurants[currentCardIndex] ?? null;
  const isFinished = session
    ? currentCardIndex >= session.restaurants.length
    : true;
  const progress = session
    ? currentCardIndex / session.restaurants.length
    : 0;

  return {
    handleSwipe,
    currentRestaurant,
    currentIndex: currentCardIndex,
    isFinished,
    progress,
    totalCards: session?.restaurants.length ?? 0,
  };
}
