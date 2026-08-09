import { Router } from "express";
import { prisma } from "../lib/prisma";

export const runlogsRouter = Router();

runlogsRouter.get("/", async (_req, res) => {
  const logs = await prisma.runLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  res.json(logs);
});
