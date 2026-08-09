import { Router } from "express";
import { prisma } from "../lib/prisma";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res) => {
  const [apps, searchConfig] = await Promise.all([
    prisma.application.findMany(),
    prisma.searchConfig.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);

  const funnelByStatus: Record<string, number> = {
    Saved: 0, Applied: 0, Screening: 0, Interview: 0, Offer: 0, Rejected: 0,
  };
  for (const app of apps) {
    funnelByStatus[app.status] = (funnelByStatus[app.status] ?? 0) + 1;
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todaysNewMatches = await prisma.job.count({ where: { createdAt: { gte: startOfDay } } });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const spend = await prisma.runLog.aggregate({
    _sum: { costUsd: true },
    where: { createdAt: { gte: monthStart } },
  });

  res.json({
    funnelByStatus,
    todaysNewMatches,
    spendThisMonthUsd: spend._sum.costUsd ?? 0,
    spendCapUsd: searchConfig?.spendCapUsd ?? 0,
  });
});
