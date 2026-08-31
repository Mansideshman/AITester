import { useEffect, useRef, useState } from "react";
import { askQuestion, getChunks, getStatus, resetIngestion, triggerIngest, uploadDocument } from "./api";
import PipelineStepper from "./components/PipelineStepper";
import IngestionPanel from "./components/IngestionPanel";
import QueryPanel from "./components/QueryPanel";
import ResultPanel from "./components/ResultPanel";
import "./App.css";

export default function App() {
  const [status, setStatus] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [result, setResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [ingestBusy, setIngestBusy] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const pollRef = useRef(null);

  const refresh = async () => {
    const s = await getStatus();
    setStatus(s);
    if (s.status === "ready") {
      const c = await getChunks();
      setChunks(c.chunks);
    } else {
      setChunks([]);
    }
    return s;
  };

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const s = await refresh();
        if (cancelled) return;
        if (s.status === "ready" || s.status === "error") {
          clearInterval(pollRef.current);
        }
      } catch {
        // backend not reachable yet; keep polling
      }
    };

    poll();
    pollRef.current = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, []);

  const handleIngest = async () => {
    setIngestBusy(true);
    setResult(null);
    setQueryError(null);
    try {
      await triggerIngest();
      await refresh();
    } catch (err) {
      setQueryError(err.message);
    } finally {
      setIngestBusy(false);
    }
  };

  const handleReset = async () => {
    setIngestBusy(true);
    setResult(null);
    setQueryError(null);
    try {
      await resetIngestion();
      await refresh();
    } catch (err) {
      setQueryError(err.message);
    } finally {
      setIngestBusy(false);
    }
  };

  const handleUpload = async (file, validationError) => {
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setIngestBusy(true);
    setUploadError(null);
    setResult(null);
    setQueryError(null);
    try {
      await uploadDocument(file);
      await refresh();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIngestBusy(false);
    }
  };

  const handleAsk = async (question) => {
    setQueryLoading(true);
    setQueryError(null);
    setResult(null);
    try {
      const r = await askQuestion(question);
      setResult(r);
    } catch (err) {
      setQueryError(err.message);
    } finally {
      setQueryLoading(false);
    }
  };

  const highlightIds = new Set(result?.retrieved_chunks?.map((c) => c.id));
  const ready = status?.status === "ready";

  return (
    <div className="app">
      <header className="app-header">
        <h1>RAG Explorer</h1>
        <p className="muted">
          A local Retrieval-Augmented Generation pipeline &mdash; upload a PDF, TXT, MD, DOC, or
          DOCX file, then watch it flow through chunking &rarr; Nomic embeddings &rarr; ChromaDB
          &rarr; retrieval &rarr; Groq answer generation.
        </p>
      </header>

      <PipelineStepper status={status} />

      <div className="app-grid">
        <IngestionPanel
          status={status}
          chunks={chunks}
          onIngest={handleIngest}
          onReset={handleReset}
          onUpload={handleUpload}
          busy={ingestBusy}
          uploadError={uploadError}
          highlightIds={highlightIds}
        />
        <div className="app-main">
          <QueryPanel onAsk={handleAsk} disabled={!ready} loading={queryLoading} />
          <ResultPanel result={result} error={queryError} loading={queryLoading} />
        </div>
      </div>
    </div>
  );
}
