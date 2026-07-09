import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from 'docx';
import type { CandidateProfile, Job, JobInsight } from './types';

// Layout follows ../docx-build.md: single column, standard section headers,
// no tables-as-layout, no photo — an ATS parser should read this cleanly.
const NAVY = '1F3A5F';
const ACCENT = 'C0392B';
const FONT = 'Calibri';

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT } },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, color: NAVY, font: FONT, size: 22 }),
    ],
  });
}

function bodyParagraph(text: string) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: FONT, size: 21 })],
  });
}

function bulletParagraph(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: FONT, size: 21 })],
  });
}

function roleLine(title: string, company: string, location: string | undefined, dateRange: string) {
  const label = [title, company].filter(Boolean).join(' — ') + (location ? ` (${location})` : '');
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { before: 160, after: 40 },
    children: [
      new TextRun({ text: label, bold: true, font: FONT, size: 21 }),
      new TextRun({ text: `\t${dateRange}`, font: FONT, size: 21, italics: true }),
    ],
  });
}

/** Merges profile skills with keywords the candidate has confirmed for this specific job (never unconfirmed ones). */
function skillsFor(profile: CandidateProfile, insight: JobInsight | null): string[] {
  const combined = new Set([...profile.coreSkills, ...profile.strengths, ...(insight?.matchedSkills ?? [])]);
  return Array.from(combined);
}

export async function buildResumeDocx(
  profile: CandidateProfile,
  job: Job | null,
  insight: JobInsight | null
): Promise<Blob> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: profile.fullName || 'Your Name', bold: true, color: NAVY, font: FONT, size: 32 }),
      ],
    })
  );

  const contactLine = [profile.email, profile.phone, profile.location].filter(Boolean).join('  |  ');
  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: contactLine, font: FONT, size: 20 })],
      })
    );
  }

  const summaryText = job
    ? `${profile.professionalSummary || insight?.summaryDraft || ''} Tailored for the ${job.jobTitle} role at ${job.companyName}.`.trim()
    : (profile.professionalSummary || insight?.summaryDraft || '');
  if (summaryText) {
    children.push(sectionHeading('Professional Summary'), bodyParagraph(summaryText));
  }

  const skills = skillsFor(profile, insight);
  if (skills.length > 0) {
    children.push(sectionHeading('Core Skills'), bodyParagraph(skills.join('  •  ')));
  }

  if (profile.experience.length > 0) {
    children.push(sectionHeading('Work Experience'));
    for (const entry of profile.experience) {
      children.push(roleLine(entry.title, entry.company, entry.location, `${entry.startDate} – ${entry.endDate}`));
      for (const bullet of entry.bullets.filter(Boolean)) {
        children.push(bulletParagraph(bullet));
      }
    }
  }

  if (profile.education.length > 0) {
    children.push(sectionHeading('Education'));
    for (const line of profile.education.filter(Boolean)) {
      children.push(bodyParagraph(line));
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBlob(doc);
}

export function resumeFileName(profile: CandidateProfile, job: Job | null): string {
  const who = (profile.fullName || 'Resume').replace(/\s+/g, '_');
  const target = job ? `_${job.companyName.replace(/\s+/g, '_')}` : '';
  return `${who}${target}_Resume.docx`;
}

export async function downloadResumeDocx(profile: CandidateProfile, job: Job | null, insight: JobInsight | null) {
  const blob = await buildResumeDocx(profile, job, insight);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = resumeFileName(profile, job);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
