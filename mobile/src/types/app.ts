export type SwipeVote = "left_no" | "right_want" | "up_must" | "neutral";

export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  priceLevel: number;
  cuisineTags: string[];
  imageUrl?: string;
  distanceMeters?: number;
  etaMinutes?: number;
}

export interface SessionResponse {
  id: string;
  hostUserId: string;
  status: "waiting" | "active" | "matched" | "expired";
  strategy: "consensus";
  locationLat: number;
  locationLng: number;
  radiusKm: number;
  budgetLevel: number;
  timerSeconds: number;
  createdAt: string;
  expiresAt: string;
}

export interface Candidate {
  id: string;
  sessionId: string;
  restaurantId: string;
  rankScore: number;
  isActive: boolean;
  distanceMeters: number;
  etaMinutes: number;
  restaurant: Restaurant;
}

export interface MatchResult {
  id: string;
  sessionId: string;
  restaurantId: string;
  decidedBy: "consensus" | "auto_pick";
  decidedAt: string;
}

export interface MatchWithRestaurant {
  match: MatchResult;
  restaurant: Restaurant;
}
