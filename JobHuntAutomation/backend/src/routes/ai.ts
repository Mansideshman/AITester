import { Router } from "express";
import { prisma } from "../lib/prisma";
import { fromJson, toJson } from "../lib/json";
import { tailorResume } from "../services/tailor";
import { draft as draftText, DraftType } from "../services/draft";

export const aiRouter = Router();

async function loadJobAndProfile(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  const profile = await prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  return { job, profile };
}

aiRouter.post("/", async (req, res) => {
  const { action, jobId, draftType } = req.body ?? {};
  if (!jobId) return res.status(400).json({ error: "jobId is required" });

  const { job, profile } = await loadJobAndProfile(jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (!profile) return res.status(404).json({ error: "Profile not seeded" });

  const verifiedMetrics = fromJson<string[]>(profile.verifiedMetrics, []);

  if (action === "tailor") {
    const result = await tailorResume({
      jobTitle: job.title,
      companyName: job.company,
      jdText: job.jdText ?? "",
      profileResumeText: profile.resumeText,
      verifiedMetrics,
      coreStack: [],
    });
    const resumeVersion = await prisma.resumeVersion.create({
      data: {
        jobId: job.id,
        summary: result.summary,
        skills: toJson(result.skills),
        bullets: toJson(result.bullets),
        atsText: result.atsText,
        diff: toJson(result.diff),
      },
    });
    return res.json({
      id: resumeVersion.id,
      summary: result.summary,
      skills: result.skills,
      bullets: result.bullets,
      atsText: result.atsText,
      diff: result.diff,
      createdAt: resumeVersion.createdAt,
    });
  }

  if (action === "draft") {
    if (!["coverLetter", "coldEmail"].includes(draftType)) {
      return res.status(400).json({ error: "draftType must be 'coverLetter' or 'coldEmail'" });
    }
    const body = await draftText(draftType as DraftType, {
      jobTitle: job.title,
      companyName: job.company,
      jdText: job.jdText ?? "",
      profileName: profile.name,
      verifiedMetrics,
      matchedSkills: [],
    });
    const record = await prisma.draft.create({
      data: { jobId: job.id, type: draftType, body },
    });
    return res.json({ id: record.id, type: record.type, body: record.body, createdAt: record.createdAt });
  }

  res.status(400).json({ error: "action must be 'tailor' or 'draft'" });
});
