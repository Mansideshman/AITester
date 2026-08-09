import { Router } from "express";
import { prisma } from "../lib/prisma";
import { fromJson, toJson } from "../lib/json";

export const profileRouter = Router();

function serialize(profile: NonNullable<Awaited<ReturnType<typeof prisma.profile.findFirst>>>) {
  return {
    id: profile.id,
    name: profile.name,
    base: profile.base,
    constraints: fromJson(profile.constraints, {}),
    targetTitles: fromJson<string[]>(profile.targetTitles, []),
    verifiedMetrics: fromJson<string[]>(profile.verifiedMetrics, []),
    resumeText: profile.resumeText,
    updatedAt: profile.updatedAt,
  };
}

profileRouter.get("/", async (_req, res) => {
  const profile = await prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!profile) return res.status(404).json({ error: "Profile not seeded" });
  res.json(serialize(profile));
});

profileRouter.put("/", async (req, res) => {
  const existing = await prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!existing) return res.status(404).json({ error: "Profile not seeded" });
  const { name, base, constraints, targetTitles, verifiedMetrics, resumeText } = req.body ?? {};
  const updated = await prisma.profile.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined && { name }),
      ...(base !== undefined && { base }),
      ...(constraints !== undefined && { constraints: toJson(constraints) }),
      ...(targetTitles !== undefined && { targetTitles: toJson(targetTitles) }),
      ...(verifiedMetrics !== undefined && { verifiedMetrics: toJson(verifiedMetrics) }),
      ...(resumeText !== undefined && { resumeText }),
    },
  });
  res.json(serialize(updated));
});
