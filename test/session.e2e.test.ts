import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("session API", () => {
  it("creates session and resolves consensus match", async () => {
    const app = buildApp();
    await app.ready();

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/sessions",
      payload: {
        hostUserId: "google:host-1",
        locationLat: 32.0853,
        locationLng: 34.7818,
        radiusKm: 5,
        budgetLevel: 2,
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();
    expect(created.session.id).toBeTypeOf("string");
    const sessionId = created.session.id as string;

    const joinResponse = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/join`,
      payload: {
        userId: "google:friend-1",
      },
    });
    expect(joinResponse.statusCode).toBe(200);

    const candidatesResponse = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/candidates`,
    });
    expect(candidatesResponse.statusCode).toBe(200);
    const candidatesPayload = candidatesResponse.json();
    expect(candidatesPayload.candidates.length).toBeGreaterThan(0);
    const restaurantId = candidatesPayload.candidates[0].restaurantId as string;

    const vote1 = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/votes`,
      payload: {
        userId: "google:host-1",
        restaurantId,
        vote: "right_want",
      },
    });
    expect(vote1.statusCode).toBe(200);
    expect(vote1.json().match).toBeNull();

    const vote2 = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/votes`,
      payload: {
        userId: "google:friend-1",
        restaurantId,
        vote: "up_must",
      },
    });
    expect(vote2.statusCode).toBe(200);
    expect(vote2.json().match).not.toBeNull();

    const matchResponse = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/match`,
    });
    expect(matchResponse.statusCode).toBe(200);
    expect(matchResponse.json().restaurant.id).toBe(restaurantId);

    await app.close();
  });
});
