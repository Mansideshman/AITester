import { Router } from "express";
import { isApifyConfigured, isAnthropicConfigured, isJSearchConfigured, ANTHROPIC_MODEL } from "../lib/env";

export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res) => {
  const jsearchOn = isJSearchConfigured();
  const apifyOn = isApifyConfigured();
  res.json({
    jsearch: {
      configured: jsearchOn,
      status: jsearchOn ? "configured (free tier, active fetch source)" : "not configured",
    },
    apify: {
      configured: apifyOn,
      status: jsearchOn
        ? "configured, but unused while JSearch is active"
        : apifyOn
          ? "configured (paid, active fetch source)"
          : "not configured (mock mode)",
    },
    anthropic: {
      configured: isAnthropicConfigured(),
      status: isAnthropicConfigured() ? "configured" : "not configured (mock mode)",
      model: ANTHROPIC_MODEL,
    },
  });
});
