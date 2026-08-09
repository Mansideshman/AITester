import { Router } from "express";
import { prisma } from "../lib/prisma";

export const applicationsRouter = Router();

const STATUSES = ["Saved", "Applied", "Screening", "Interview", "Offer", "Rejected"];

function serialize(app: any) {
  return {
    id: app.id,
    jobId: app.jobId,
    company: app.company,
    title: app.title,
    status: app.status,
    appliedDate: app.appliedDate,
    resumeVersionId: app.resumeVersionId,
    coverLetterSent: app.coverLetterSent,
    coldEmailSent: app.coldEmailSent,
    recruiter: app.recruiter,
    nextAction: app.nextAction,
    nextActionDate: app.nextActionDate,
    notes: app.notes,
    timeZone: app.timeZone,
    source: app.job?.source,
    location: app.job?.location,
    workType: app.job?.workType,
    jdUrl: app.job?.jdUrl,
    applyUrl: app.job?.applyUrl,
    fitScore: app.job?.fitScore,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

applicationsRouter.get("/", async (_req, res) => {
  const apps = await prisma.application.findMany({ include: { job: true }, orderBy: { updatedAt: "desc" } });
  res.json(apps.map(serialize));
});

applicationsRouter.post("/mark-applied", async (req, res) => {
  const { jobId, resumeVersionId, coverLetterSent, coldEmailSent } = req.body ?? {};
  if (!jobId) return res.status(400).json({ error: "jobId is required" });

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return res.status(404).json({ error: "Job not found" });

  const existing = await prisma.application.findUnique({
    where: { company_title: { company: job.company, title: job.title } },
  });

  const data = {
    status: "Applied",
    appliedDate: new Date(),
    resumeVersionId: resumeVersionId ?? existing?.resumeVersionId ?? null,
    coverLetterSent: Boolean(coverLetterSent ?? existing?.coverLetterSent ?? false),
    coldEmailSent: Boolean(coldEmailSent ?? existing?.coldEmailSent ?? false),
  };

  const application = existing
    ? await prisma.application.update({ where: { id: existing.id }, data, include: { job: true } })
    : await prisma.application.create({
        data: { jobId: job.id, company: job.company, title: job.title, ...data },
        include: { job: true },
      });

  res.json(serialize(application));
});

applicationsRouter.patch("/:id", async (req, res) => {
  const { status, recruiter, nextAction, nextActionDate, notes, timeZone } = req.body ?? {};
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
  }
  const application = await prisma.application.update({
    where: { id: req.params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(recruiter !== undefined && { recruiter }),
      ...(nextAction !== undefined && { nextAction }),
      ...(nextActionDate !== undefined && { nextActionDate: nextActionDate ? new Date(nextActionDate) : null }),
      ...(notes !== undefined && { notes }),
      ...(timeZone !== undefined && { timeZone }),
    },
    include: { job: true },
  });
  res.json(serialize(application));
});

applicationsRouter.get("/export.csv", async (_req, res) => {
  const apps = await prisma.application.findMany({ include: { job: true }, orderBy: { createdAt: "asc" } });
  const headers = [
    "Date Added", "Status", "Company", "Role/Title", "Location", "Work Type", "Source",
    "JD/Apply URL", "Est. Pay/LPA", "Fit %", "Resume Version Used", "Cover Letter (Y/N)",
    "Cold Email (Y/N)", "Recruiter/Contact", "Next Action", "Next Action Date", "Notes (incl. Time Zone)",
  ];
  const rows = apps.map((a) => [
    a.createdAt.toISOString(),
    a.status,
    a.company,
    a.title,
    a.job?.location ?? "",
    a.job?.workType ?? "",
    a.job?.source ?? "",
    a.job?.applyUrl ?? a.job?.jdUrl ?? "",
    a.job?.estPay ?? "",
    String(a.job?.fitScore ?? ""),
    a.resumeVersionId ?? "",
    a.coverLetterSent ? "Y" : "N",
    a.coldEmailSent ? "Y" : "N",
    a.recruiter ?? "",
    a.nextAction ?? "",
    a.nextActionDate ? a.nextActionDate.toISOString() : "",
    [a.notes, a.timeZone].filter(Boolean).join(" | "),
  ]);
  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="job-tracker-export.csv"');
  res.send(csv);
});
