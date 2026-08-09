import { Router } from "express";
import { prisma } from "../lib/prisma";
import { fromJson } from "../lib/json";

export const jobsRouter = Router();

function serialize(job: any) {
  return {
    id: job.id,
    externalId: job.externalId,
    source: job.source,
    title: job.title,
    company: job.company,
    location: job.location,
    workType: job.workType,
    postedTime: job.postedTime,
    jdUrl: job.jdUrl,
    applyUrl: job.applyUrl,
    jdText: job.jdText,
    estPay: job.estPay,
    tzOverlap: job.tzOverlap,
    fitScore: job.fitScore,
    fitReasons: fromJson<string[]>(job.fitReasons, []),
    flags: fromJson<string[]>(job.flags, []),
    status: job.status,
    createdAt: job.createdAt,
    hasApplication: Boolean(job.application),
  };
}

jobsRouter.get("/", async (req, res) => {
  const { tz, minFit, source, flag, status } = req.query as Record<string, string | undefined>;
  const jobs = await prisma.job.findMany({
    where: {
      ...(tz && { tzOverlap: tz }),
      ...(source && { source }),
      ...(status ? { status } : { status: { not: "dismissed" } }),
      ...(minFit && { fitScore: { gte: Number(minFit) } }),
    },
    orderBy: { fitScore: "desc" },
    include: { application: true },
  });
  const filtered = flag ? jobs.filter((j) => fromJson<string[]>(j.flags, []).includes(flag)) : jobs;
  res.json(filtered.map(serialize));
});

jobsRouter.get("/sources", async (_req, res) => {
  const rows = await prisma.job.findMany({ select: { source: true }, distinct: ["source"] });
  res.json(rows.map((r) => r.source).sort());
});

jobsRouter.get("/:id", async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { application: true, resumeVersions: true, drafts: true },
  });
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({
    ...serialize(job),
    resumeVersions: job.resumeVersions.map((rv) => ({
      id: rv.id,
      summary: rv.summary,
      skills: fromJson<string[]>(rv.skills, []),
      bullets: fromJson<string[]>(rv.bullets, []),
      atsText: rv.atsText,
      diff: fromJson<string[]>(rv.diff, []),
      createdAt: rv.createdAt,
    })),
    drafts: job.drafts.map((d) => ({ id: d.id, type: d.type, body: d.body, createdAt: d.createdAt })),
  });
});

jobsRouter.patch("/:id", async (req, res) => {
  const { status } = req.body ?? {};
  if (!status || !["saved", "dismissed"].includes(status)) {
    return res.status(400).json({ error: "status must be 'saved' or 'dismissed'" });
  }
  const job = await prisma.job.update({ where: { id: req.params.id }, data: { status } });
  res.json(serialize(job));
});
