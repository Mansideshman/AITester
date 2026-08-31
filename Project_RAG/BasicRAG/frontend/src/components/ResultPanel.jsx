function SimilarityBar({ value }) {
  const pct = Math.round(value * 100);
  return (
    <div className="similarity-bar">
      <div className="similarity-bar-fill" style={{ width: `${pct}%` }} />
      <span className="similarity-bar-label">{pct}%</span>
    </div>
  );
}

export default function ResultPanel({ result, error, loading }) {
  if (loading) {
    return (
      <div className="panel result-panel">
        <div className="panel-header">
          <h2>Retrieval &amp; Answer</h2>
        </div>
        <p className="muted">Embedding query → searching ChromaDB → generating answer with Groq…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel result-panel">
        <div className="panel-header">
          <h2>Retrieval &amp; Answer</h2>
        </div>
        <div className="pipeline-error">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel result-panel">
        <div className="panel-header">
          <h2>Retrieval &amp; Answer</h2>
        </div>
        <p className="muted">Ask a question to see the top 4 retrieved chunks and the generated answer.</p>
      </div>
    );
  }

  return (
    <div className="panel result-panel">
      <div className="panel-header">
        <h2>Retrieval &amp; Answer</h2>
        <span className="muted">{result.timings_ms.total_ms} ms total</span>
      </div>

      <h3 className="result-subheading">Top {result.retrieved_chunks.length} Retrieved Chunks</h3>
      <div className="retrieved-list">
        {result.retrieved_chunks.map((c, i) => (
          <div key={c.id} className="retrieved-card">
            <div className="retrieved-card-header">
              <span className="chunk-id">#{c.chunk_index} (chunk {i + 1})</span>
              <span className="chunk-page">page {c.page}</span>
            </div>
            <SimilarityBar value={c.similarity} />
            <p className="chunk-text">{c.text}</p>
          </div>
        ))}
      </div>

      <h3 className="result-subheading">
        Answer <span className="muted">· Groq · {result.llm_model}</span>
      </h3>
      <div className="answer-box">{result.answer}</div>

      <div className="timings">
        <span>embed query: {result.timings_ms.embed_query_ms} ms</span>
        <span>retrieve: {result.timings_ms.retrieve_ms} ms</span>
        <span>generate: {result.timings_ms.generate_ms} ms</span>
      </div>
    </div>
  );
}
