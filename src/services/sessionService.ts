import { v4 as uuidv4 } from "uuid";
import {
  CreateSessionInput,
  Match,
  Restaurant,
  Session,
  SessionCandidate,
  SessionMember,
  Vote,
  VoteInput,
} from "../domain/types.js";
import { InMemoryStore } from "../store/inMemoryStore.js";
import { GooglePlacesService } from "./googlePlacesService.js";
import {
  autoPickBestCandidate,
  calculateRankScore,
  isCandidateRejectedByAnyVote,
  resolveConsensusMatch,
} from "./matchingEngine.js";

export class SessionService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly placesService: GooglePlacesService,
  ) {}

  async createSession(input: CreateSessionInput): Promise<Session> {
    const now = new Date();
    const session: Session = {
      id: uuidv4(),
      hostUserId: input.hostUserId,
      status: "active",
      strategy: "consensus",
      locationLat: input.locationLat,
      locationLng: input.locationLng,
      radiusKm: input.radiusKm,
      budgetLevel: input.budgetLevel,
      timerSeconds: input.timerSeconds ?? 120,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + (input.timerSeconds ?? 120) * 1000).toISOString(),
    };
    this.store.sessions.set(session.id, session);

    const hostMember: SessionMember = {
      id: uuidv4(),
      sessionId: session.id,
      userId: input.hostUserId,
      role: "host",
      joinedAt: now.toISOString(),
    };
    this.store.membersBySession.set(session.id, [hostMember]);
    this.store.votesBySession.set(session.id, []);
    this.store.candidatesBySession.set(session.id, []);

    const restaurants = await this.placesService.fetchRestaurants({
      lat: input.locationLat,
      lng: input.locationLng,
      radiusKm: input.radiusKm,
      budgetLevel: input.budgetLevel,
      cuisinePreferences: input.cuisinePreferences,
    });

    const candidates = this.buildCandidates(session, restaurants);
    this.store.candidatesBySession.set(session.id, candidates);

    return session;
  }

  joinSession(sessionId: string, userId: string): SessionMember {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== "active" && session.status !== "waiting") {
      throw new Error("Session is not joinable");
    }

    const members = this.store.membersBySession.get(sessionId) ?? [];
    if (members.some((member) => member.userId === userId)) {
      return members.find((member) => member.userId === userId)!;
    }

    const member: SessionMember = {
      id: uuidv4(),
      sessionId,
      userId,
      role: "member",
      joinedAt: new Date().toISOString(),
    };
    this.store.membersBySession.set(sessionId, [...members, member]);
    return member;
  }

  getSessionState(sessionId: string): {
    session: Session;
    members: SessionMember[];
    candidates: SessionCandidate[];
    match: Match | null;
  } {
    const session = this.getSessionOrThrow(sessionId);
    return {
      session,
      members: this.store.membersBySession.get(sessionId) ?? [],
      candidates: this.store.candidatesBySession.get(sessionId) ?? [],
      match: this.store.matchesBySession.get(sessionId) ?? null,
    };
  }

  getCandidates(sessionId: string): Array<SessionCandidate & { restaurant: Restaurant }> {
    this.getSessionOrThrow(sessionId);
    const candidates = this.store.candidatesBySession.get(sessionId) ?? [];
    return candidates
      .filter((candidate) => candidate.isActive)
      .sort((a, b) => b.rankScore - a.rankScore)
      .map((candidate) => ({
        ...candidate,
        restaurant: this.getRestaurantOrThrow(candidate.restaurantId),
      }));
  }

  castVote(sessionId: string, input: VoteInput): { match: Match | null; candidateRemoved: boolean } {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== "active") {
      throw new Error("Session is not active");
    }

    const members = this.store.membersBySession.get(sessionId) ?? [];
    if (!members.some((member) => member.userId === input.userId)) {
      throw new Error("User is not part of this session");
    }

    const candidates = this.store.candidatesBySession.get(sessionId) ?? [];
    const candidate = candidates.find(
      (currentCandidate) =>
        currentCandidate.restaurantId === input.restaurantId && currentCandidate.isActive,
    );
    if (!candidate) {
      throw new Error("Restaurant is not an active candidate");
    }

    const nowIso = new Date().toISOString();
    const votes = this.store.votesBySession.get(sessionId) ?? [];
    const withoutExisting = votes.filter(
      (vote) => !(vote.userId === input.userId && vote.restaurantId === input.restaurantId),
    );
    const vote: Vote = {
      id: uuidv4(),
      sessionId,
      restaurantId: input.restaurantId,
      userId: input.userId,
      vote: input.vote,
      createdAt: nowIso,
    };
    const updatedVotes = [...withoutExisting, vote];
    this.store.votesBySession.set(sessionId, updatedVotes);

    const restaurantVotes = updatedVotes.filter((currentVote) => currentVote.restaurantId === input.restaurantId);
    const candidateRemoved = isCandidateRejectedByAnyVote(restaurantVotes);
    if (candidateRemoved) {
      candidate.isActive = false;
      this.store.candidatesBySession.set(sessionId, candidates);
      return { match: null, candidateRemoved: true };
    }

    const match = resolveConsensusMatch({
      sessionId,
      restaurantId: input.restaurantId,
      memberUserIds: members.map((member) => member.userId),
      votes: restaurantVotes,
      nowIso,
    });
    if (!match) {
      return { match: null, candidateRemoved: false };
    }

    this.store.matchesBySession.set(sessionId, match);
    this.store.sessions.set(sessionId, { ...session, status: "matched" });
    return { match, candidateRemoved: false };
  }

  autoPick(sessionId: string): Match {
    const session = this.getSessionOrThrow(sessionId);
    const candidates = this.store.candidatesBySession.get(sessionId) ?? [];
    const votes = this.store.votesBySession.get(sessionId) ?? [];
    const best = autoPickBestCandidate(candidates, votes);

    if (!best) {
      throw new Error("No candidate available to auto-pick");
    }

    const match: Match = {
      id: uuidv4(),
      sessionId,
      restaurantId: best.restaurantId,
      decidedBy: "auto_pick",
      decidedAt: new Date().toISOString(),
    };
    this.store.matchesBySession.set(sessionId, match);
    this.store.sessions.set(sessionId, { ...session, status: "matched" });
    return match;
  }

  getMatch(sessionId: string): { match: Match | null; restaurant: Restaurant | null } {
    this.getSessionOrThrow(sessionId);
    const match = this.store.matchesBySession.get(sessionId) ?? null;
    if (!match) {
      return { match: null, restaurant: null };
    }
    return { match, restaurant: this.getRestaurantOrThrow(match.restaurantId) };
  }

  private buildCandidates(session: Session, restaurants: Restaurant[]): SessionCandidate[] {
    return restaurants.map((restaurant) => {
      this.store.restaurants.set(restaurant.id, restaurant);
      const distanceMeters = restaurant.distanceMeters ?? 1200;
      const etaMinutes = restaurant.etaMinutes ?? 20;
      const priceFit = 1 - Math.min(1, Math.abs(restaurant.priceLevel - session.budgetLevel) / 4);

      return {
        id: uuidv4(),
        sessionId: session.id,
        restaurantId: restaurant.id,
        rankScore: calculateRankScore({
          distanceMeters,
          rating: restaurant.rating,
          etaMinutes,
          priceFit,
        }),
        isActive: true,
        distanceMeters,
        etaMinutes,
      };
    });
  }

  private getSessionOrThrow(sessionId: string): Session {
    const session = this.store.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    return session;
  }

  private getRestaurantOrThrow(restaurantId: string): Restaurant {
    const restaurant = this.store.restaurants.get(restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }
    return restaurant;
  }
}
