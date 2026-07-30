import type { CandidateProfile, Job, JobInsight } from './types';
import { applyConfirmations, buildAtsAnalysis, splitByConfirmation } from './keywords';

export const defaultCandidateProfile: CandidateProfile = {
  targetRole: 'Senior QA Engineer',
  yearsExperience: '5+',
  coreSkills: ['Playwright', 'Selenium', 'API Testing', 'TypeScript', 'Automation Strategy'],
  strengths: ['Cross-team collaboration', 'Test architecture', 'CI/CD integration'],
  experience: [],
  education: [],
  confirmedKeywordsByJob: {},
  declinedKeywordsByJob: {},
};

export function buildJobInsight(job: Job | null, profile: CandidateProfile): JobInsight | null {
  if (!job) return null;

  const jdText = job.jobDescription || profile.jobDescription || '';
  const rawAts = buildAtsAnalysis(jdText, profile);
  const { needsConfirmation, confirmedExtra } = splitByConfirmation(rawAts.missing, job.id, profile);
  // Folds confirmed-for-this-job keywords into the table so the ✅/❌ column
  // and match % reflect what the candidate told us, not just literal resume text.
  const ats = applyConfirmations(rawAts, confirmedExtra);

  // Only keywords the candidate has actually evidenced (matched in their
  // resume/profile) or explicitly confirmed for this job are ever presented
  // as "theirs" — never the ones still pending confirmation.
  const matchedSkills = ats.matched;
  const missingSkills = ats.missing;

  const roleSignal = /qa|quality|automation|sdet|engineer|developer|test/i.test(job.jobTitle) ? 18 : 8;
  const skillSignal = ats.table.length ? Math.round((matchedSkills.length / ats.table.length) * 55) : 0;
  const senioritySignal = /senior|lead|principal|staff/i.test(job.jobTitle) ? 12 : 0;
  const noteSignal = job.notes && job.notes.trim().length > 0 ? 10 : 0;
  const fitScore = Math.max(50, Math.min(98, roleSignal + skillSignal + senioritySignal + noteSignal));

  const resumeStrengthSignal = (profile.professionalSummary || profile.resumeSummary) ? 10 : 0;
  const descriptionSignal = jdText.length > 0 ? 10 : 0;
  const atsScore = Math.min(100, Math.round(50 + (ats.matchPct / 100) * 40 + resumeStrengthSignal + descriptionSignal));

  const summary = matchedSkills.length > 0
    ? `${job.companyName} looks like a strong match for your ${profile.targetRole} profile, especially around ${matchedSkills.slice(0, 3).join(', ')}.`
    : `${job.companyName} looks promising, but this role will need a sharper resume and cover letter tailored to the JD.`;

  const resumeRecommendations = [
    !profile.professionalSummary && !profile.resumeSummary && 'Fill in your professional summary in the Candidate Profile panel so tailoring has real content to work with.',
    !jdText && 'Paste the full job description on the job card to generate cover letter and follow-up drafts.',
    needsConfirmation.length > 0 && `The JD also mentions ${needsConfirmation.slice(0, 3).join(', ')} — confirm which of these you genuinely have before they're added anywhere.`,
    missingSkills.length === 0 && ats.table.length > 0 && 'Your current profile covers the JD keywords well; focus on quantifying results in your resume.',
  ].filter(Boolean) as string[];

  const nextActions = [
    matchedSkills.length > 0
      ? `Highlight ${matchedSkills.slice(0, 3).join(', ')} in your tailored resume and cover letter.`
      : 'Review the JD and add any missing, verifiable core skills to your profile.',
    needsConfirmation.length > 0
      ? `Confirm whether you have hands-on experience with: ${needsConfirmation.slice(0, 4).join(', ')}.`
      : 'Use the job description text to guide your ATS keyword matching and cover letter language.',
    resumeRecommendations.length > 0
      ? resumeRecommendations[0]
      : 'Your profile and JD information are good; focus on matching resume bullets with role outcomes.',
    'Track this application and move it to Follow-up once you submit so the status reflects your next outreach step.',
  ];

  const emphasizedKeywords = matchedSkills.length > 0
    ? matchedSkills.slice(0, 4)
    : ['Automation', 'Quality Engineering', 'Collaboration', 'Test Strategy'];

  const summaryDraft = `I am a ${profile.targetRole} with ${profile.yearsExperience} of experience focused on ${emphasizedKeywords.slice(0, 3).join(', ')}. I bring strong experience in quality engineering, automation strategy, and cross-functional delivery, with a track record of building reliable testing practices and supporting high-quality releases.`;

  const bulletStrengtheningIdeas = [
    `Add a resume bullet showing hands-on work with ${emphasizedKeywords[0] || 'the core domain'} in a real delivery context.`,
    'Use metrics whenever possible to show the impact of your automation or quality work.',
    'Mention cross-functional ownership, release support, and collaboration to reinforce senior-level fit.',
  ];

  const coverLetterDraft = `Dear ${job.companyName} hiring team,

I am excited about the ${job.jobTitle} opportunity because it aligns closely with my ${profile.yearsExperience} of experience in ${matchedSkills.slice(0, 3).join(', ') || profile.coreSkills.slice(0, 3).join(', ')} and quality engineering. I have a strong track record of delivering reliable automation, improving test coverage, and partnering with product and engineering teams to ship higher-quality releases.

Based on the role, I would emphasize ${emphasizedKeywords.join(', ')} and my ability to turn testing strategy into repeatable outcomes. I would love to discuss how I can contribute to your team and support the next phase of quality improvements.

Thank you for your consideration,
${profile.fullName || '[Your Name]'}`;

  const followUpEmailSeries = [
    {
      title: 'Initial Follow-Up',
      message: `Hi ${job.companyName} team,\n\nI wanted to follow up on my application for the ${job.jobTitle} role. I remain very interested and believe my experience in ${emphasizedKeywords.slice(0, 2).join(', ')} would be a strong fit for your team. Please let me know if there is any additional information I can provide.\n\nThank you,\n${profile.fullName || '[Your Name]'}`,
    },
    {
      title: 'One Week Reminder',
      message: `Hi ${job.companyName} team,\n\nI'm checking back on the ${job.jobTitle} position. I'm excited about the opportunity to help improve automation and quality practices, and I'd welcome the chance to discuss how my background can support your goals.\n\nBest regards,\n${profile.fullName || '[Your Name]'}`,
    },
    {
      title: 'Final Follow-Up',
      message: `Hi ${job.companyName} team,\n\nI wanted to close the loop on my interest in the ${job.jobTitle} role. If the role is still open, I'm very interested in speaking further. If not, I appreciate your time and would welcome future opportunities.\n\nSincerely,\n${profile.fullName || '[Your Name]'}`,
    },
  ];

  const outreachDraft = [
    `Hi ${job.companyName} team,`,
    `I am interested in the ${job.jobTitle} opportunity and would love to learn more about the role.`,
    `I bring strong experience in ${emphasizedKeywords.slice(0, 2).join(', ')} and proven delivery in quality engineering.`,
    'If this is still open, I would appreciate the chance to connect or apply directly.',
  ].join(' ');

  return {
    fitScore,
    atsScore,
    atsMatchPct: ats.matchPct,
    summary,
    matchedSkills,
    missingSkills: missingSkills.slice(0, 4),
    atsTable: ats.table,
    mustConfirmKeywords: needsConfirmation,
    // ats.missing now only contains declined-or-pending keywords (confirmed
    // ones were folded into "matched" above); excluding the pending ones
    // leaves just what the candidate explicitly declined — the honest gaps.
    remainingGaps: ats.missing.filter((k) => !needsConfirmation.includes(k)),
    resumeRecommendations,
    nextActions,
    emphasizedKeywords,
    bulletStrengtheningIdeas,
    summaryDraft,
    outreachDraft,
    coverLetterDraft,
    followUpEmailSeries,
    generatedAt: Date.now(),
  };
}
