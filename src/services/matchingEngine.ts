import { Match, SessionCandidate, Vote, VoteValue } from "../domain/types.js";

const voteWeight: Record<VoteValue, number> = {
  left_no: -100,
  neutral: 0,
  right_want: 60,
  up_must: 100,
};

function normalize(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, value / max));
}

export function calculateRankScore(input: {
  distanceMeters: number;
  rating: number;
  etaMinutes: number;
  priceFit: number; // 0..1
}): number {
  const proximityScore = 1 - normalize(input.distanceMeters, 8000);
  const ratingScore = normalize(input.rating, 5);
  const etaScore = 1 - normalize(input.etaMinutes, 90);
  const priceFit = Math.max(0, Math.min(1, input.priceFit));

  return Number(
    (
      proximityScore * 0.45 +
      ratingScore * 0.2 +
      etaScore * 0.15 +
      priceFit * 0.1 +
      0.1
    ).toFixed(4),
  );
}

export function resolveConsensusMatch(input: {
  sessionId: string;
  restaurantId: string;
  memberUserIds: string[];
  votes: Vote[];
  nowIso: string;
}): Match | null {
  const byUser = new Map<string, VoteValue>();
  for (const vote of input.votes) {
    byUser.set(vote.userId, vote.vote);
  }

  for (const memberId of input.memberUserIds) {
    const value = byUser.get(memberId);
    if (value !== "right_want" && value !== "up_must") {
      return null;
    }
  }

  return {
    id: `match_${input.sessionId}`,
    sessionId: input.sessionId,
    restaurantId: input.restaurantId,
    decidedBy: "consensus",
    decidedAt: input.nowIso,
  };
}

export function isCandidateRejectedByAnyVote(votes: Vote[]): boolean {
  return votes.some((vote) => vote.vote === "left_no");
}

export function autoPickBestCandidate(
  candidates: SessionCandidate[],
  votes: Vote[],
): SessionCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  const voteScoreByRestaurant = new Map<string, number>();
  for (const vote of votes) {
    const current = voteScoreByRestaurant.get(vote.restaurantId) ?? 0;
    voteScoreByRestaurant.set(vote.restaurantId, current + voteWeight[vote.vote]);
  }

  const scored = candidates
    .filter((candidate) => candidate.isActive)
    .map((candidate) => {
      const voteScore = voteScoreByRestaurant.get(candidate.restaurantId) ?? 0;
      return {
        candidate,
        total: candidate.rankScore * 100 + voteScore,
      };
    })
    .sort((a, b) => b.total - a.total);

  return scored[0]?.candidate ?? null;
}
