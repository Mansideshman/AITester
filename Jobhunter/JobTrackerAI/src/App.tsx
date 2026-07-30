import React, { useState, useEffect, useMemo } from 'react';
import type { CandidateProfile, Job, JobInsight } from './types';
import { addJob, updateJob, deleteJob, getAllJobs, getProfile, saveProfile } from './db';
import { KanbanBoard } from './components/KanbanBoard';
import { FollowUpModal } from './components/FollowUpModal';
import { JobModal } from './components/JobModal';
import { KeywordConfirmModal } from './components/KeywordConfirmModal';
import { buildJobInsight, defaultCandidateProfile } from './assistant';
import { downloadResumeDocx } from './resumeDocx';
import { Plus, Search, Moon, Sun, Download, Upload, Sparkles, ClipboardList, FileDown, Copy, ShieldCheck } from 'lucide-react';
import { ProfilePanel } from './components/ProfilePanel';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(defaultCandidateProfile);

  useEffect(() => {
    getAllJobs().then(setJobs).catch(console.error);
    getProfile().then((saved) => { if (saved) setCandidateProfile(saved); }).catch(console.error);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const assistantInsights = useMemo(() => {
    const nextInsights: Record<string, JobInsight> = {};
    jobs.forEach((job) => {
      const insight = buildJobInsight(job, candidateProfile);
      if (insight) nextInsights[job.id] = insight;
    });
    return nextInsights;
  }, [candidateProfile, jobs]);

  const existingResumes = useMemo(() => {
    const resumes = new Set<string>();
    jobs.forEach(j => {
      if (j.resumeUsed) resumes.add(j.resumeUsed.trim());
    });
    return Array.from(resumes);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (!searchQuery) return jobs;
    const lowerQ = searchQuery.toLowerCase();
    return jobs.filter(j => 
      j.companyName.toLowerCase().includes(lowerQ) ||
      j.jobTitle.toLowerCase().includes(lowerQ)
    );
  }, [jobs, searchQuery]);

  const selectedInsight = selectedJob ? assistantInsights[selectedJob.id] ?? null : null;

  const handleSaveJob = async (job: Job) => {
    const isEditing = jobs.some(j => j.id === job.id);
    if (isEditing) {
      await updateJob(job);
      setJobs(prev => prev.map(j => j.id === job.id ? job : j));
    } else {
      await addJob(job);
      setJobs(prev => [...prev, job]);
    }
  };

  const handleUpdateJobStateDirect = async (job: Job) => {
    const prevJob = jobs.find(j => j.id === job.id);
    await updateJob(job);
    setJobs(prev => prev.map(j => j.id === job.id ? job : j));

    // If status changed to Applied, attach the assistant-generated follow-up series
    if (prevJob?.status !== job.status && job.status === 'Applied') {
      const insight = assistantInsights[job.id] || buildJobInsight(job, candidateProfile);
      if (insight && insight.followUpEmailSeries && insight.followUpEmailSeries.length > 0) {
        const updated = { ...job, followUpEmailSeries: insight.followUpEmailSeries };
        await updateJob(updated);
        setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
      }
    }
  };

  const handleDeleteJob = async (id: string) => {
    await deleteJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jobs, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "job-tracker-backup.json");
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedJobs = JSON.parse(event.target?.result as string) as Job[];
        // Basic validation
        if (Array.isArray(importedJobs) && importedJobs.every(j => j.id && j.companyName)) {
          // Merge by id instead of wiping the board, so re-importing an
          // agent's applied-jobs export never destroys manually tracked jobs.
          const merged = new Map(jobs.map(j => [j.id, j]));
          for (const j of importedJobs) {
            merged.set(j.id, j);
            await updateJob(j);
          }
          const mergedJobs = Array.from(merged.values());
          setJobs(mergedJobs);
          alert(`Import successful! Added/updated ${importedJobs.length} job(s).`);
        } else {
          alert('Invalid JSON file format.');
        }
      } catch (err) {
        alert('Error parsing JSON file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const openAddModal = () => {
    setEditingJob(null);
    setSelectedJob(null);
    setIsModalOpen(true);
  };

  const closeModals = () => {
    setIsModalOpen(false);
    setEditingJob(null);
  };

  const [followUpModalJob, setFollowUpModalJob] = useState<Job | null>(null);
  const [confirmModalJob, setConfirmModalJob] = useState<Job | null>(null);

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
  };

  const handleSaveProfile = (profile: CandidateProfile) => {
    setCandidateProfile(profile);
    saveProfile(profile).catch(console.error);
  };

  const handleKeywordConfirm = (confirmed: string[], declined: string[]) => {
    if (!confirmModalJob) return;
    const jobId = confirmModalJob.id;
    const updated: CandidateProfile = {
      ...candidateProfile,
      confirmedKeywordsByJob: {
        ...candidateProfile.confirmedKeywordsByJob,
        [jobId]: Array.from(new Set([...(candidateProfile.confirmedKeywordsByJob[jobId] ?? []), ...confirmed])),
      },
      declinedKeywordsByJob: {
        ...candidateProfile.declinedKeywordsByJob,
        [jobId]: Array.from(new Set([...(candidateProfile.declinedKeywordsByJob[jobId] ?? []), ...declined])),
      },
    };
    handleSaveProfile(updated);
    setConfirmModalJob(null);
  };

  const handleCopyCoverLetter = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Cover letter copied to clipboard');
    } catch {
      alert('Unable to copy to clipboard');
    }
  };

  const handleDownloadResume = () => {
    if (!selectedJob) return;
    downloadResumeDocx(candidateProfile, selectedJob, selectedInsight).catch((err) => {
      console.error(err);
      alert('Could not generate the resume file.');
    });
  };

  const handleApply = async (job: Job) => {
    const updated = { ...job, status: 'Applied' } as Job;
    await handleUpdateJobStateDirect(updated);

    // Ensure follow-up series is available in insight
    const insight = assistantInsights[updated.id] || buildJobInsight(updated, candidateProfile);
    const jobWithFollowups = { ...updated, followUpEmailSeries: insight?.followUpEmailSeries ?? updated.followUpEmailSeries } as Job;

    setFollowUpModalJob(jobWithFollowups);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-lg p-2 text-white">
            <Plus size={20} className="rotate-45" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Job Tracker</h1>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="relative w-full max-w-sm hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button title="Toggle Theme" onClick={toggleTheme} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button title="Export Data" onClick={handleExport} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Download size={20} />
            </button>
            <label title="Import Data" className="p-2 cursor-pointer text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Upload size={20} />
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button onClick={openAddModal} className="hidden sm:flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-full font-medium text-sm hover:opacity-90 active:scale-95 transition-all">
              <Plus size={16} />
              <span>Add Job</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Actions */}
      <div className="sm:hidden px-4 pt-4 flex gap-3">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <button onClick={openAddModal} className="flex-shrink-0 flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 w-10 h-10 rounded-lg shadow">
             <Plus size={20} />
          </button>
      </div>

      <main className="flex-1 overflow-hidden p-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="min-h-0 flex flex-col gap-6">
          <div className="max-h-[42vh] overflow-y-auto shrink-0">
            <ProfilePanel profile={candidateProfile} onSave={handleSaveProfile} />
          </div>
          <div className="flex-1 min-h-0">
            <KanbanBoard
              jobs={filteredJobs}
              setJobs={setJobs}
              onUpdateJob={handleUpdateJobStateDirect}
              onEdit={(job) => { setEditingJob(job); setSelectedJob(job); setIsModalOpen(true); }}
              onDelete={handleDeleteJob}
              onSelectJob={handleSelectJob}
              onApply={handleApply}
            />
          </div>
        </div>

        <aside className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-5 shadow-sm overflow-auto">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-blue-600" size={18} />
            <h2 className="text-lg font-semibold">AI Job Hunt Copilot</h2>
          </div>

          {selectedInsight ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Fit score</div>
                  <div className="text-3xl font-semibold">{selectedInsight.fitScore}/100</div>
                </div>

                <div className="rounded-xl bg-green-50 dark:bg-green-950/40 p-3">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300">ATS score</div>
                  <div className="text-3xl font-semibold">{selectedInsight.atsScore}/100</div>
                </div>
              </div>

              <button
                onClick={handleDownloadResume}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-2 text-sm font-medium hover:opacity-90"
              >
                <FileDown size={16} />
                Download tailored resume (.docx)
              </button>

              <div>
                <div className="text-sm font-semibold mb-1">Assistant summary</div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedInsight.summary}</p>
              </div>

              {selectedInsight.atsTable.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-1">
                    ATS keyword match — {selectedInsight.atsMatchPct}% of named technical keywords present
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden text-sm">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800/70 text-xs text-gray-500 dark:text-gray-400">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-medium">Keyword</th>
                          <th className="text-left px-3 py-1.5 font-medium">In resume?</th>
                          <th className="text-left px-3 py-1.5 font-medium">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInsight.atsTable.map((row) => (
                          <tr key={row.keyword} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="px-3 py-1.5">{row.keyword}</td>
                            <td className="px-3 py-1.5">{row.inResume ? '✅' : '❌'}</td>
                            <td className="px-3 py-1.5">{row.priority}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedInsight.mustConfirmKeywords.length > 0 && (
                <button
                  onClick={() => selectedJob && setConfirmModalJob(selectedJob)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-2 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <ShieldCheck size={16} />
                  Confirm {selectedInsight.mustConfirmKeywords.length} keyword(s) from this JD
                </button>
              )}

              {selectedInsight.remainingGaps.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-1">Honest remaining gaps</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedInsight.remainingGaps.join(', ')} — declined or not yet confirmed, so they're left out of your resume, cover letter, and follow-ups.
                  </p>
                </div>
              )}

              {selectedInsight.resumeRecommendations.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-1">Resume recommendations</div>
                  <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {selectedInsight.resumeRecommendations.map((recommendation) => (
                      <li key={recommendation}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold mb-1">Matched strengths</div>
                <div className="flex flex-wrap gap-2">
                  {selectedInsight.matchedSkills.length > 0 ? selectedInsight.matchedSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs">{skill}</span>
                  )) : <span className="text-sm text-gray-500 dark:text-gray-400">No core skills were detected in the JD/resume text yet.</span>}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">Safe next steps</div>
                <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  {selectedInsight.nextActions.map((action) => <li key={action}>{action}</li>)}
                </ul>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">Emphasize these keywords</div>
                <div className="flex flex-wrap gap-2">
                  {selectedInsight.emphasizedKeywords.map((keyword) => (
                    <span key={keyword} className="rounded-full bg-blue-100 dark:bg-blue-950/40 px-2.5 py-1 text-xs text-blue-700 dark:text-blue-300">{keyword}</span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">Strengthen these bullets</div>
                <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  {selectedInsight.bulletStrengtheningIdeas.map((idea) => <li key={idea}>{idea}</li>)}
                </ul>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">Ready-to-copy summary</div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-950/40 whitespace-pre-line">
                  {selectedInsight.summaryDraft}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold">Cover letter draft</div>
                  <button
                    onClick={() => handleCopyCoverLetter(selectedInsight.coverLetterDraft)}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-950/40 whitespace-pre-line">
                  {selectedInsight.coverLetterDraft}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">Follow-up email series</div>
                <div className="space-y-3">
                  {selectedInsight.followUpEmailSeries.map((email) => (
                    <div key={email.title} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-950/40">
                      <div className="text-sm font-semibold mb-2">{email.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{email.message}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">Manual outreach draft</div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-950/40">
                  {selectedInsight.outreachDraft}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} />
                <span>Select a job card to see AI fit guidance and a safe outreach draft.</span>
              </div>
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3">
                This assistant never automates applications or login actions. It prepares evidence-based suggestions for your review.
              </div>
            </div>
          )}
        </aside>
      </main>

      {(isModalOpen || editingJob) && (
        <JobModal 
          job={editingJob} 
          onClose={closeModals} 
          onSave={handleSaveJob}
          existingResumes={existingResumes}
        />
      )}

      {followUpModalJob && (
        <FollowUpModal job={followUpModalJob} onClose={() => setFollowUpModalJob(null)} />
      )}

      {confirmModalJob && selectedInsight && (
        <KeywordConfirmModal
          jobLabel={`${confirmModalJob.jobTitle} @ ${confirmModalJob.companyName}`}
          keywords={selectedInsight.mustConfirmKeywords}
          onClose={() => setConfirmModalJob(null)}
          onSubmit={handleKeywordConfirm}
        />
      )}
    </div>
  );
}
