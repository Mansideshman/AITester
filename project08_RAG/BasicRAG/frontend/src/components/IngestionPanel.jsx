import { useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md", ".doc", ".docx"];
const ACCEPTED_ATTR = ACCEPTED_EXTENSIONS.join(",");

const FILE_ICONS = {
  ".pdf": "📄",
  ".doc": "📝",
  ".docx": "📝",
  ".txt": "📃",
  ".md": "📃",
};

function fileIcon(name) {
  if (!name) return "📄";
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return FILE_ICONS[ext] || "📄";
}

function StatBox({ value, label }) {
  return (
    <div className="stat-box">
      <div className="stat-value">{value ?? "—"}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function IngestionPanel({
  status,
  chunks,
  onIngest,
  onReset,
  onUpload,
  busy,
  uploadError,
  highlightIds,
}) {
  const ingesting = status?.status === "ingesting" || busy;
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const validateAndUpload = (file) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      onUpload(null, `Unsupported file type "${ext}". Allowed: ${ACCEPTED_EXTENSIONS.join(", ")}`);
      return;
    }
    onUpload(file);
  };

  const handleFileChange = (e) => {
    validateAndUpload(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    validateAndUpload(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="panel ingestion-panel">
      <div className="ingestion-header">
        <h2>1 &middot; Ingestion</h2>
        <div className="ingestion-actions">
          <button className="btn-primary" onClick={onIngest} disabled={ingesting}>
            {ingesting ? "Ingesting…" : "Re-ingest"}
          </button>
          <button className="btn-secondary" onClick={onReset} disabled={ingesting}>
            Reset
          </button>
        </div>
      </div>

      <div
        className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <p>
          Drag &amp; drop a PDF, TXT, MD, DOC, or DOCX file here, or{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={ingesting}
          >
            browse
          </button>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_ATTR}
          onChange={handleFileChange}
          disabled={ingesting}
          hidden
        />
      </div>
      {uploadError && <div className="pipeline-error">{uploadError}</div>}

      {status && (
        <>
          <div className="ingestion-source">
            <span className="label">Source folder:</span> <code>{status.source_folder}</code>
          </div>
          <div className="ingestion-file">
            <span className="file-icon">{fileIcon(status.source_name)}</span> {status.source_name}
          </div>

          <div className="stat-grid">
            <StatBox value={status.num_pages || null} label="Pages" />
            <StatBox value={status.num_chunks || null} label="Chunks" />
            <StatBox value={status.embedding_dims} label="Embed dims" />
            <StatBox value={status.stored_count || null} label="Stored" />
          </div>

          {status.sample_embedding?.length > 0 && (
            <div className="embedding-sample">
              <div className="section-label">
                Sample embedding (first {status.sample_embedding.length} of {status.embedding_dims}):
              </div>
              <code className="embedding-array">
                [{status.sample_embedding.map((v) => v.toFixed(4)).join(", ")}, …]
              </code>
            </div>
          )}

          <div className="chunk-preview-section">
            <div className="section-label">Chunk preview:</div>
            {chunks.length === 0 ? (
              <p className="muted">
                {status.status === "ingesting" ? "Ingesting the document…" : "Not ingested yet."}
              </p>
            ) : (
              <div className="chunk-preview-list">
                {chunks.map((c) => (
                  <div
                    key={c.id}
                    className={`chunk-preview-card ${highlightIds?.has(c.id) ? "chunk-preview-highlight" : ""}`}
                  >
                    <div className="chunk-preview-header">
                      <span className="chunk-preview-id">chunk {c.chunk_index}</span>
                      <span className="chunk-preview-chars">{c.char_count} chars</span>
                    </div>
                    <p className="chunk-preview-text">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
