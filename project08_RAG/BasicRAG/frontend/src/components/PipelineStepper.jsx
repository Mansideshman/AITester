const STEPS = [
  {
    key: "load",
    label: "Read PDF",
    detail: (s) => (s.num_pages ? `${s.num_pages} pages · ${s.pdf_name}` : "Waiting..."),
    time: (s) => s.timings_ms?.load_ms,
  },
  {
    key: "chunk",
    label: "Chunk Text",
    detail: (s) =>
      s.num_chunks
        ? `${s.num_chunks} chunks · size ${s.chunk_size} / overlap ${s.chunk_overlap}`
        : "Waiting...",
    time: (s) => s.timings_ms?.chunk_ms,
  },
  {
    key: "embed",
    label: "Embed (Nomic)",
    detail: (s) =>
      s.embedding_dims ? `${s.embedding_dims}-dim vectors · ${s.embedding_model}` : "Waiting...",
    time: (s) => s.timings_ms?.embed_ms,
  },
  {
    key: "store",
    label: "Store in ChromaDB",
    detail: (s) => `Collection "${s.collection_name}"`,
    time: (s) => s.timings_ms?.store_ms,
  },
];

function StatusIcon({ state }) {
  if (state === "done") return <span className="step-icon step-icon-done">✓</span>;
  if (state === "active") return <span className="step-icon step-icon-active" />;
  if (state === "error") return <span className="step-icon step-icon-error">!</span>;
  return <span className="step-icon step-icon-pending" />;
}

export default function PipelineStepper({ status }) {
  if (!status) return null;

  const stepStates = { ...status.steps };
  if (status.status === "error") {
    for (const k of Object.keys(stepStates)) {
      if (stepStates[k] === "pending") stepStates[k] = "error";
      break;
    }
  } else if (status.status === "ingesting") {
    for (const k of Object.keys(stepStates)) {
      if (stepStates[k] === "pending") {
        stepStates[k] = "active";
        break;
      }
    }
  }

  return (
    <div className="pipeline">
      <div className="pipeline-header">
        <h2>Ingestion Pipeline</h2>
        <span className={`badge badge-${status.status}`}>{status.status}</span>
      </div>
      <div className="pipeline-steps">
        {STEPS.map((step, i) => (
          <div key={step.key} className="pipeline-step">
            <div className="step-row">
              <StatusIcon state={stepStates[step.key]} />
              <div className="step-text">
                <div className="step-label">{step.label}</div>
                <div className="step-detail">{step.detail(status)}</div>
                {step.time(status) != null && (
                  <div className="step-time">{step.time(status)} ms</div>
                )}
              </div>
            </div>
            {i < STEPS.length - 1 && <div className="step-connector" />}
          </div>
        ))}
      </div>
      {status.error && <div className="pipeline-error">Error: {status.error}</div>}
    </div>
  );
}
