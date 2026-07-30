import "dotenv/config";
import cron from "node-cron";
import { runPipeline, refreshNextScheduled } from "./pipeline";

console.log("[Scheduler] ContentForge scheduler starting...");

// Daily at 09:00 local time
cron.schedule("0 9 * * *", async () => {
  console.log("[Scheduler] 09:00 trigger fired — running pipeline");
  refreshNextScheduled();
  await runPipeline();
});

console.log("[Scheduler] Cron registered: daily at 09:00 local time.");

// Keep the process alive when run standalone
process.on("SIGINT", () => {
  console.log("[Scheduler] Shutting down.");
  process.exit(0);
});
