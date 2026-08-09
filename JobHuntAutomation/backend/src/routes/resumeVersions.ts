import { Router } from "express";
import { prisma } from "../lib/prisma";
import { fromJson } from "../lib/json";
import { buildResumeDocx } from "../services/resumeDocx";

export const resumeVersionsRouter = Router();

resumeVersionsRouter.get("/:id/download", async (req, res) => {
  const format = (req.query.format as string) || "txt";
  const resumeVersion = await prisma.resumeVersion.findUnique({ where: { id: req.params.id } });
  if (!resumeVersion) return res.status(404).json({ error: "Resume version not found" });

  const profile = await prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  const skills = fromJson<string[]>(resumeVersion.skills, []);
  const bullets = fromJson<string[]>(resumeVersion.bullets, []);

  if (format === "docx") {
    const buffer = await buildResumeDocx({
      candidateName: profile?.name ?? "Candidate",
      summary: resumeVersion.summary,
      skills,
      bullets,
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="resume-${resumeVersion.id}.docx"`);
    return res.send(buffer);
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="resume-${resumeVersion.id}.txt"`);
  res.send(resumeVersion.atsText);
});
