export async function register() {
  // Only run in Node.js server runtime, not Edge or client
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { runPipeline, refreshNextScheduled } = await import("./lib/pipeline");

    console.log("[Instrumentation] Registering daily cron at 09:00...");

    cron.schedule("0 9 * * *", async () => {
      console.log("[Cron] 09:00 fired — starting pipeline");
      refreshNextScheduled();
      await runPipeline();
    });

    console.log("[Instrumentation] Scheduler active.");
  }
}
