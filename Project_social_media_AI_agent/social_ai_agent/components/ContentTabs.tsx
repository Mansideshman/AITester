"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ContentRow } from "@/lib/types";

interface Props {
  row: ContentRow | null;
}

type Tab = "linkedin" | "medium" | "instagram" | "youtube" | "devto";

const TABS: { key: Tab; label: string }[] = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "medium", label: "Medium" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "devto", label: "Dev.to" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function ContentSection({ label, text, markdown = false }: { label: string; text: string; markdown?: boolean }) {
  const [open, setOpen] = useState(true);
  if (!text) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-400">
        {label} not generated yet.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <CopyButton text={text} />
          <span className="text-gray-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-3">
          {markdown ? (
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{text}</pre>
          )}
        </div>
      )}
    </div>
  );
}

function ImageCard({ src, alt }: { src: string; alt: string }) {
  if (!src) return null;
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <img src={src} alt={alt} className="w-full object-cover max-h-64" />
      <p className="px-3 py-1.5 text-xs text-gray-400">{alt}</p>
    </div>
  );
}

export function ContentTabs({ row }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("linkedin");

  if (!row) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
        No content for today yet. Run the pipeline to generate content.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? "border-b-2 border-brand-500 text-brand-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {activeTab === "linkedin" && (
          <>
            <ContentSection label="LinkedIn Post" text={row.linkedinPost} />
            <ImageCard src={row.linkedinImage} alt="LinkedIn image" />
          </>
        )}
        {activeTab === "medium" && (
          <>
            <ContentSection label="Medium Article" text={row.mediumArticle} markdown />
            <ImageCard src={row.mediumImage} alt="Medium cover image" />
          </>
        )}
        {activeTab === "instagram" && (
          <>
            <ContentSection label="Instagram Script" text={row.igScript} />
            <ImageCard src={row.igImage} alt="Instagram image" />
          </>
        )}
        {activeTab === "youtube" && (
          <ContentSection label="YouTube Script" text={row.ytScript} />
        )}
        {activeTab === "devto" && (
          <ContentSection label="Dev.to Article" text={row.devtoArticle} markdown />
        )}
      </div>
    </div>
  );
}
