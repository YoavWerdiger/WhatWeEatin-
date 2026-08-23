import Fastify from "fastify";
import cors from "@fastify/cors";
import { InMemoryStore } from "./store/inMemoryStore.js";
import { GooglePlacesService } from "./services/googlePlacesService.js";
import { SessionService } from "./services/sessionService.js";
import { buildAuthRoutes } from "./routes/authRoutes.js";
import { buildSessionRoutes } from "./routes/sessionRoutes.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  const store = new InMemoryStore();
  const placesService = new GooglePlacesService();
  const sessionService = new SessionService(store, placesService);

  app.register(cors, {
    origin: true,
  });

  app.get("/health", async () => ({ ok: true }));

  app.register(buildAuthRoutes(store));
  app.register(buildSessionRoutes(sessionService));

  return app;
}
