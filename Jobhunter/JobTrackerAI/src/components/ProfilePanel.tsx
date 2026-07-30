import { useMemo, useState } from 'react';
import type { CandidateProfile, ExperienceEntry } from '../types';
import { Sparkles, Save, Upload, FileText, Plus, Trash2 } from 'lucide-react';

interface ProfilePanelProps {
  profile: CandidateProfile;
  onSave: (profile: CandidateProfile) => void;
}

function newExperienceEntry(): ExperienceEntry {
  return {
    id: crypto.randomUUID(),
    company: '',
    title: '',
    location: '',
    startDate: '',
    endDate: '',
    bullets: [],
  };
}

export function ProfilePanel({ profile, onSave }: ProfilePanelProps) {
  // profile only ever changes via this panel's own handleSave round-trip, so
  // the initial value is the only sync point needed — no prop-sync effect.
  const [draft, setDraft] = useState(profile);

  const skillInput = useMemo(() => draft.coreSkills.join(', '), [draft.coreSkills]);

  const handleSave = () => {
    onSave({
      ...draft,
      coreSkills: draft.coreSkills.map((skill) => skill.trim()).filter(Boolean),
      strengths: draft.strengths.map((s) => s.trim()).filter(Boolean),
      education: draft.education.map((line) => line.trim()).filter(Boolean),
      experience: draft.experience.map((entry) => ({
        ...entry,
        bullets: entry.bullets.map((b) => b.trim()).filter(Boolean),
      })),
      resumeFileName: draft.resumeFileName?.trim() || undefined,
      resumeSummary: draft.resumeSummary?.trim() || undefined,
      jobDescription: draft.jobDescription?.trim() || undefined,
      fullName: draft.fullName?.trim() || undefined,
      email: draft.email?.trim() || undefined,
      phone: draft.phone?.trim() || undefined,
      location: draft.location?.trim() || undefined,
      professionalSummary: draft.professionalSummary?.trim() || undefined,
    });
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text().catch(() => '');
    const preview = text ? text.slice(0, 1200) : `Uploaded file: ${file.name}`;

    setDraft((prev) => ({
      ...prev,
      resumeFileName: file.name,
      resumeSummary: preview,
    }));
  };

  const updateExperience = (id: string, field: keyof ExperienceEntry, value: string) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.map((entry) =>
        entry.id === id
          ? { ...entry, [field]: field === 'bullets' ? value.split('\n') : value }
          : entry
      ),
    }));
  };

  const addExperience = () => {
    setDraft((prev) => ({ ...prev, experience: [...prev.experience, newExperienceEntry()] }));
  };

  const removeExperience = (id: string) => {
    setDraft((prev) => ({ ...prev, experience: prev.experience.filter((entry) => entry.id !== id) }));
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-blue-600" size={18} />
        <h2 className="text-lg font-semibold">Candidate Profile</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-700 dark:text-gray-300">Full name</span>
          <input
            value={draft.fullName ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            placeholder="Jane Doe"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-700 dark:text-gray-300">Email</span>
          <input
            value={draft.email ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            placeholder="jane@example.com"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-700 dark:text-gray-300">Phone</span>
          <input
            value={draft.phone ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-700 dark:text-gray-300">Location</span>
          <input
            value={draft.location ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            placeholder="Pune, India"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-gray-700 dark:text-gray-300">Target role</span>
        <input
          value={draft.targetRole}
          onChange={(e) => setDraft((prev) => ({ ...prev, targetRole: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-gray-700 dark:text-gray-300">Years of experience</span>
        <input
          value={draft.yearsExperience}
          onChange={(e) => setDraft((prev) => ({ ...prev, yearsExperience: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-gray-700 dark:text-gray-300">Professional summary</span>
        <textarea
          value={draft.professionalSummary ?? ''}
          onChange={(e) => setDraft((prev) => ({ ...prev, professionalSummary: e.target.value }))}
          rows={3}
          placeholder="2-3 sentences: title, years of experience, and your strongest differentiators."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-gray-700 dark:text-gray-300">Core skills (comma separated)</span>
        <input
          value={skillInput}
          onChange={(e) => setDraft((prev) => ({ ...prev, coreSkills: e.target.value.split(',').map((item) => item.trim()) }))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-gray-700 dark:text-gray-300">Strengths (comma separated)</span>
        <input
          value={draft.strengths.join(', ')}
          onChange={(e) => setDraft((prev) => ({ ...prev, strengths: e.target.value.split(',').map((item) => item.trim()) }))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
        />
      </label>

      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Work experience</span>
          <button
            type="button"
            onClick={addExperience}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus size={14} /> Add role
          </button>
        </div>

        {draft.experience.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No roles yet — add each job so the tailored resume has real content to work with.
          </p>
        )}

        {draft.experience.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
            <div className="flex justify-between gap-2">
              <input
                value={entry.title}
                onChange={(e) => updateExperience(entry.id, 'title', e.target.value)}
                placeholder="Job title"
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeExperience(entry.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <input
              value={entry.company}
              onChange={(e) => updateExperience(entry.id, 'company', e.target.value)}
              placeholder="Company"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                value={entry.location ?? ''}
                onChange={(e) => updateExperience(entry.id, 'location', e.target.value)}
                placeholder="Location"
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
              />
              <input
                value={entry.startDate}
                onChange={(e) => updateExperience(entry.id, 'startDate', e.target.value)}
                placeholder="Start (e.g. Jan 2022)"
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
              />
              <input
                value={entry.endDate}
                onChange={(e) => updateExperience(entry.id, 'endDate', e.target.value)}
                placeholder="End (e.g. Present)"
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
              />
            </div>
            <textarea
              value={entry.bullets.join('\n')}
              onChange={(e) => updateExperience(entry.id, 'bullets', e.target.value)}
              rows={3}
              placeholder="One achievement bullet per line"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-gray-700 dark:text-gray-300">Education (one entry per line)</span>
        <textarea
          value={draft.education.join('\n')}
          onChange={(e) => setDraft((prev) => ({ ...prev, education: e.target.value.split('\n') }))}
          rows={2}
          placeholder="B.S. Computer Science — XYZ University, 2015"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
        />
      </label>

      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <Upload size={16} />
          Resume / JD intake
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700 dark:text-gray-300">Upload resume document</span>
          <input
            type="file"
            accept=".txt,.md,.json,.pdf,.doc,.docx"
            onChange={handleResumeUpload}
            className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white"
          />
        </label>

        {draft.resumeFileName && (
          <div className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/70 p-2 text-sm">
            <FileText size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">{draft.resumeFileName}</div>
              <div className="text-gray-500 dark:text-gray-400 line-clamp-3">{draft.resumeSummary}</div>
            </div>
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700 dark:text-gray-300">Paste job description / JD</span>
          <textarea
            value={draft.jobDescription ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, jobDescription: e.target.value }))}
            rows={6}
            placeholder="Paste the job description here so the assistant can tailor suggestions to it."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
      </div>

      <button
        onClick={handleSave}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
      >
        <Save size={16} />
        Save profile
      </button>
    </div>
  );
}
