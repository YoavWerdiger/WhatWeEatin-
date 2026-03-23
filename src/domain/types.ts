export type SessionStatus = "waiting" | "active" | "matched" | "expired";
export type MatchingStrategy = "consensus";
export type VoteValue = "left_no" | "right_want" | "up_must" | "neutral";

export interface User {
  id: string;
  displayName: string;
  email?: string;
}

export interface Session {
  id: string;
  hostUserId: string;
  status: SessionStatus;
  strategy: MatchingStrategy;
  locationLat: number;
  locationLng: number;
  radiusKm: number;
  budgetLevel: number;
  timerSeconds: number;
  createdAt: string;
  expiresAt: string;
}

export interface SessionMember {
  id: string;
  sessionId: string;
  userId: string;
  role: "host" | "member";
  joinedAt: string;
}

export interface Restaurant {
  id: string;
  externalId: string;
  name: string;
  cuisineTags: string[];
  rating: number;
  priceLevel: number;
  lat: number;
  lng: number;
  imageUrl?: string;
  distanceMeters?: number;
  etaMinutes?: number;
}

export interface SessionCandidate {
  id: string;
  sessionId: string;
  restaurantId: string;
  rankScore: number;
  isActive: boolean;
  distanceMeters: number;
  etaMinutes: number;
}

export interface Vote {
  id: string;
  sessionId: string;
  restaurantId: string;
  userId: string;
  vote: VoteValue;
  createdAt: string;
}

export interface Match {
  id: string;
  sessionId: string;
  restaurantId: string;
  decidedBy: "consensus" | "auto_pick";
  decidedAt: string;
}

export interface CreateSessionInput {
  hostUserId: string;
  locationLat: number;
  locationLng: number;
  radiusKm: number;
  budgetLevel: number;
  timerSeconds?: number;
  cuisinePreferences?: string[];
}

export interface JoinSessionInput {
  userId: string;
}

export interface VoteInput {
  userId: string;
  restaurantId: string;
  vote: VoteValue;
}
