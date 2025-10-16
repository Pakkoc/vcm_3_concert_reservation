import type { Hono } from "hono";
import type { AppEnv } from "@/backend/hono/context";
import { getSupabase } from "@/backend/hono/context";
import { respond } from "@/backend/http/response";
import {
  createReservation,
  getReservationSummary,
  lookupReservations,
} from "./service";

export const registerReservationRoutes = (app: Hono<AppEnv>) => {
  app.post("/api/reservations", async (c) => {
    const supabase = getSupabase(c);
    const payload = await c.req.json();
    const result = await createReservation(supabase, payload);
    return respond(c, result);
  });

  app.get("/api/reservations/:reservationId", async (c) => {
    const supabase = getSupabase(c);
    const result = await getReservationSummary(
      supabase,
      c.req.param("reservationId"),
    );
    return respond(c, result);
  });

  app.post("/api/reservations/lookup", async (c) => {
    const supabase = getSupabase(c);
    const payload = await c.req.json();
    const result = await lookupReservations(supabase, payload);
    return respond(c, result);
  });
};
