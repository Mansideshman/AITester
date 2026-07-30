import type { Job } from '../types';
import { X, Clipboard, Mail } from 'lucide-react';

interface FollowUpModalProps {
  job: Job;
  onClose: () => void;
}

export function FollowUpModal({ job, onClose }: FollowUpModalProps) {
  const first = job.followUpEmailSeries && job.followUpEmailSeries.length > 0 ? job.followUpEmailSeries[0] : null;

  const handleCopy = async () => {
    if (!first) return;
    try {
      await navigator.clipboard.writeText(first.message);
      alert('Copied follow-up to clipboard');
    } catch {
      alert('Unable to copy to clipboard');
    }
  };

  const handleMail = () => {
    if (!first) return;
    const subject = encodeURIComponent(first.title || `Following up on ${job.jobTitle}`);
    const body = encodeURIComponent(first.message || '');
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Prepare follow-up</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">First follow-up for: {job.companyName} — {job.jobTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded">
            <X />
          </button>
        </div>

        <div className="mt-4">
          {first ? (
            <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-950/40 whitespace-pre-line text-sm text-gray-700 dark:text-gray-200">
              <div className="font-medium mb-2">{first.title}</div>
              <div>{first.message}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No follow-up messages generated for this job yet.</div>
          )}
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={handleCopy} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
            <Clipboard /> Copy
          </button>
          <button onClick={handleMail} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-sm">
            <Mail /> Open Mail Client
          </button>
          <button onClick={onClose} className="px-3 py-2 bg-white dark:bg-gray-700 border rounded text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
