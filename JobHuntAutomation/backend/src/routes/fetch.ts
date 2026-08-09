import { Router } from "express";
import { runFetch } from "../services/fetchJobs";

export const fetchRouter = Router();

fetchRouter.post("/linkedin", async (_req, res) => {
  try {
    const outcome = await runFetch("linkedin");
    res.json(outcome);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

fetchRouter.post("/indeed", async (_req, res) => {
  try {
    const outcome = await runFetch("indeed");
    res.json(outcome);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

fetchRouter.post("/all", async (_req, res) => {
  try {
    const outcome = await runFetch("all");
    res.json(outcome);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
