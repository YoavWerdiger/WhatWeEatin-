import {
  Candidate,
  MatchWithRestaurant,
  SessionResponse,
  SwipeVote,
} from "../types/app";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

class ApiError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      // keep default message
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export const api = {
  async login(input: {
    provider: "google" | "apple" | "phone";
    providerUserId: string;
    displayName: string;
    email?: string;
  }): Promise<{ user: { id: string; displayName: string }; accessToken: string }> {
    return request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async createSession(input: {
    hostUserId: string;
    locationLat: number;
    locationLng: number;
    radiusKm: number;
    budgetLevel: number;
    timerSeconds?: number;
    cuisinePreferences?: string[];
  }): Promise<{ session: SessionResponse; inviteLink: string }> {
    return request("/v1/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async joinSession(sessionId: string, userId: string): Promise<void> {
    await request(`/v1/sessions/${sessionId}/join`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  async getCandidates(sessionId: string): Promise<Candidate[]> {
    const result = await request<{ candidates: Candidate[] }>(
      `/v1/sessions/${sessionId}/candidates`,
      { method: "GET" },
    );
    return result.candidates;
  },

  async getSessionState(sessionId: string): Promise<{ session: SessionResponse }> {
    return request(`/v1/sessions/${sessionId}/state`, { method: "GET" });
  },

  async castVote(sessionId: string, input: { userId: string; restaurantId: string; vote: SwipeVote }): Promise<{
    candidateRemoved: boolean;
    match: { sessionId: string; restaurantId: string } | null;
  }> {
    return request(`/v1/sessions/${sessionId}/votes`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async autoPick(sessionId: string): Promise<void> {
    await request(`/v1/sessions/${sessionId}/auto-pick`, { method: "POST" });
  },

  async getMatch(sessionId: string): Promise<MatchWithRestaurant | null> {
    const result = await request<{
      match: MatchWithRestaurant["match"] | null;
      restaurant: MatchWithRestaurant["restaurant"] | null;
    }>(`/v1/sessions/${sessionId}/match`, { method: "GET" });
    if (!result.match || !result.restaurant) {
      return null;
    }
    return {
      match: result.match,
      restaurant: result.restaurant,
    };
  },
};

export { API_BASE_URL, ApiError };
