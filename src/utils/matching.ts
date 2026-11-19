import { Restaurant, Vote, VoteType, SessionUser, MatchResult, MatchStrategy } from '../types';

const VOTE_WEIGHTS: Record<VoteType, number> = {
  superlike: 3,
  like: 1,
  dislike: -2,
};

interface RestaurantScore {
  restaurant: Restaurant;
  score: number;
  likeCount: number;
  superlikeCount: number;
  dislikeCount: number;
  voters: string[];
}

function calculateScores(
  restaurants: Restaurant[],
  allVotes: Record<string, Vote[]>,
  users: SessionUser[],
): RestaurantScore[] {
  const scores: Map<string, RestaurantScore> = new Map();

  for (const restaurant of restaurants) {
    scores.set(restaurant.id, {
      restaurant,
      score: 0,
      likeCount: 0,
      superlikeCount: 0,
      dislikeCount: 0,
      voters: [],
    });
  }

  for (const [userId, votes] of Object.entries(allVotes)) {
    for (const vote of votes) {
      const entry = scores.get(vote.restaurantId);
      if (!entry) continue;

      entry.score += VOTE_WEIGHTS[vote.vote];
      entry.voters.push(userId);

      if (vote.vote === 'like') entry.likeCount++;
      else if (vote.vote === 'superlike') entry.superlikeCount++;
      else entry.dislikeCount++;
    }
  }

  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}

/**
 * Restaurants every online player liked (or superliked) — group shortlist after round 1.
 */
/**
 * Uses everyone in `session.users`, not `isOnline` — presence is flaky in Firestore
 * and must not shrink the group for matching (that caused false consensus).
 */
export function getMutualPositiveRestaurants(
  restaurants: Restaurant[],
  allVotes: Record<string, Vote[]>,
  users: SessionUser[],
): Restaurant[] {
  if (users.length === 0) return [];

  return restaurants.filter((r) =>
    users.every((user) => {
      const userVotes = allVotes[user.id] || [];
      const vote = userVotes.find((v) => v.restaurantId === r.id);
      return vote && (vote.vote === 'like' || vote.vote === 'superlike');
    }),
  );
}

/**
 * Consensus auto-match only when there is exactly one restaurant everyone liked.
 * If the group agreed on several places, they must finish in round 2 (shortlist / duel).
 */
export function findConsensusMatch(
  restaurants: Restaurant[],
  allVotes: Record<string, Vote[]>,
  users: SessionUser[],
  excludeRestaurantIds: string[] = [],
): MatchResult | null {
  const mutual = getMutualPositiveRestaurants(
    restaurants,
    allVotes,
    users,
  ).filter((r) => !excludeRestaurantIds.includes(r.id));
  if (mutual.length !== 1) return null;

  const restaurant = mutual[0];
  const scores = calculateScores(restaurants, allVotes, users);
  const entry = scores.find((s) => s.restaurant.id === restaurant.id);

  const agreedUsers = users.filter((u) => {
    const userVotes = allVotes[u.id] || [];
    const vote = userVotes.find((v) => v.restaurantId === restaurant.id);
    return vote && (vote.vote === 'like' || vote.vote === 'superlike');
  });

  return {
    restaurant,
    agreedUsers,
    score: entry?.score ?? 0,
    strategy: 'consensus',
  };
}

export function findMajorityMatch(
  restaurants: Restaurant[],
  allVotes: Record<string, Vote[]>,
  users: SessionUser[],
  excludeRestaurantIds: string[] = [],
): MatchResult | null {
  const scores = calculateScores(restaurants, allVotes, users);
  const voters = users;
  if (voters.length === 0) return null;
  /** Strict majority: more than half (for 2 players → both must agree). */
  const majority = Math.floor(voters.length / 2) + 1;

  for (const entry of scores) {
    if (excludeRestaurantIds.includes(entry.restaurant.id)) continue;
    const positiveVoters = voters.filter(user => {
      const userVotes = allVotes[user.id] || [];
      const vote = userVotes.find(v => v.restaurantId === entry.restaurant.id);
      return vote && (vote.vote === 'like' || vote.vote === 'superlike');
    });

    if (positiveVoters.length >= majority) {
      return {
        restaurant: entry.restaurant,
        agreedUsers: positiveVoters,
        score: entry.score,
        strategy: 'majority',
      };
    }
  }
  return null;
}

export function findWeightedMatch(
  restaurants: Restaurant[],
  allVotes: Record<string, Vote[]>,
  users: SessionUser[],
  excludeRestaurantIds: string[] = [],
): MatchResult | null {
  const scores = calculateScores(restaurants, allVotes, users);
  const best = scores.find((s) => !excludeRestaurantIds.includes(s.restaurant.id));
  if (!best) return null;

  const agreedUsers = users.filter(user => {
    const userVotes = allVotes[user.id] || [];
    const vote = userVotes.find(v => v.restaurantId === best.restaurant.id);
    return vote && (vote.vote === 'like' || vote.vote === 'superlike');
  });

  return {
    restaurant: best.restaurant,
    agreedUsers,
    score: best.score,
    strategy: 'weighted',
  };
}

export function findMatch(
  restaurants: Restaurant[],
  allVotes: Record<string, Vote[]>,
  users: SessionUser[],
  strategy: MatchStrategy,
  excludeRestaurantIds: string[] = [],
): MatchResult | null {
  switch (strategy) {
    case 'consensus':
      return findConsensusMatch(restaurants, allVotes, users, excludeRestaurantIds);
    case 'majority':
      return findMajorityMatch(restaurants, allVotes, users, excludeRestaurantIds);
    case 'weighted': {
      const totalVotes = Object.values(allVotes).reduce((n, arr) => n + arr.length, 0);
      if (totalVotes === 0) return null;
      return findWeightedMatch(restaurants, allVotes, users, excludeRestaurantIds);
    }
  }
}

export function getAIDecision(
  restaurants: Restaurant[],
  allVotes: Record<string, Vote[]>,
  users: SessionUser[],
): MatchResult | null {
  if (!restaurants.length) return null;

  const r = findWeightedMatch(restaurants, allVotes, users, []);
  if (r) return r;

  const scores = calculateScores(restaurants, allVotes, users);
  const fallback = scores[0];
  if (!fallback) return null;

  return {
    restaurant: fallback.restaurant,
    agreedUsers: [],
    score: fallback.score,
    strategy: 'weighted',
  };
}

export function getPickyRanking(
  users: SessionUser[],
  allVotes: Record<string, Vote[]>,
): { user: SessionUser; rejectRate: number }[] {
  return users
    .map(user => {
      const votes = allVotes[user.id] || [];
      const total = votes.length || 1;
      const dislikes = votes.filter(v => v.vote === 'dislike').length;
      return { user, rejectRate: dislikes / total };
    })
    .sort((a, b) => b.rejectRate - a.rejectRate);
}
