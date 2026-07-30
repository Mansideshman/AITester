import { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface KeywordConfirmModalProps {
  jobLabel: string;
  keywords: string[];
  onClose: () => void;
  onSubmit: (confirmed: string[], declined: string[]) => void;
}

export function KeywordConfirmModal({ jobLabel, keywords, onClose, onSubmit }: KeywordConfirmModalProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (keyword: string) => {
    setChecked((prev) => ({ ...prev, [keyword]: !prev[keyword] }));
  };

  const handleSubmit = () => {
    const confirmed = keywords.filter((k) => checked[k]);
    const declined = keywords.filter((k) => !checked[k]);
    onSubmit(confirmed, declined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-lg font-semibold">Confirm before adding</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {jobLabel} mentions these keywords, but they're not in your profile yet. Only check the
                ones you genuinely have hands-on experience with — unchecked ones stay out of your resume,
                cover letter, and follow-ups.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded shrink-0">
            <X />
          </button>
        </div>

        <div className="mt-4 max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-800 rounded-md p-3">
          {keywords.map((keyword) => (
            <label key={keyword} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!checked[keyword]}
                onChange={() => toggle(keyword)}
                className="rounded border-gray-300"
              />
              <span>{keyword}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
            Decide later
          </button>
          <button onClick={handleSubmit} className="px-3 py-2 text-sm bg-blue-600 text-white rounded">
            Save answers
          </button>
        </div>
      </div>
    </div>
  );
}
