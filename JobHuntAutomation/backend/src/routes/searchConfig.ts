import { Router } from "express";
import { prisma } from "../lib/prisma";
import { fromJson, toJson } from "../lib/json";

export const searchConfigRouter = Router();

function serialize(row: NonNullable<Awaited<ReturnType<typeof prisma.searchConfig.findFirst>>>) {
  return {
    id: row.id,
    keywords: fromJson<string[]>(row.keywords, []),
    locations: fromJson<string[]>(row.locations, []),
    workType: fromJson<string[]>(row.workType, []),
    datePosted: row.datePosted,
    jobType: fromJson<string[]>(row.jobType, []),
    spendCapUsd: row.spendCapUsd,
    updatedAt: row.updatedAt,
  };
}

searchConfigRouter.get("/", async (_req, res) => {
  const row = await prisma.searchConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row) return res.status(404).json({ error: "SearchConfig not seeded" });
  res.json(serialize(row));
});

searchConfigRouter.put("/", async (req, res) => {
  const existing = await prisma.searchConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!existing) return res.status(404).json({ error: "SearchConfig not seeded" });
  const { keywords, locations, workType, datePosted, jobType, spendCapUsd } = req.body ?? {};
  const updated = await prisma.searchConfig.update({
    where: { id: existing.id },
    data: {
      ...(keywords !== undefined && { keywords: toJson(keywords) }),
      ...(locations !== undefined && { locations: toJson(locations) }),
      ...(workType !== undefined && { workType: toJson(workType) }),
      ...(datePosted !== undefined && { datePosted }),
      ...(jobType !== undefined && { jobType: toJson(jobType) }),
      ...(spendCapUsd !== undefined && { spendCapUsd }),
    },
  });
  res.json(serialize(updated));
});
