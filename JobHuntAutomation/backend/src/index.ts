import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { profileRouter } from "./routes/profile";
import { searchConfigRouter } from "./routes/searchConfig";
import { fetchRouter } from "./routes/fetch";
import { jobsRouter } from "./routes/jobs";
import { aiRouter } from "./routes/ai";
import { resumeVersionsRouter } from "./routes/resumeVersions";
import { applicationsRouter } from "./routes/applications";
import { runlogsRouter } from "./routes/runlogs";
import { settingsRouter } from "./routes/settings";
import { dashboardRouter } from "./routes/dashboard";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/profile", profileRouter);
app.use("/api/search-config", searchConfigRouter);
app.use("/api/fetch", fetchRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/resume-versions", resumeVersionsRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/run-logs", runlogsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);

// Auto-serve the built frontend if it's present alongside this checkout (VPS deploy
// pattern: one process serves both API and UI). Local dev runs the frontend via its own
// `vite` dev server instead, so this is a no-op unless `frontend/dist` actually exists.
const frontendDist = path.join(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const port = Number(process.env.PORT) || 8420;
app.listen(port, () => {
  console.log(`JobHunt Copilot backend listening on http://localhost:${port}`);
});
