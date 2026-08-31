import { useState } from "react";

const SAMPLE_QUESTIONS = [
  "What is VWO and what problem does it solve?",
  "Who are the target users of the platform?",
  "What are the key features in this PRD?",
  "What does success look like for this product?",
];

export default function QueryPanel({ onAsk, disabled, loading }) {
  const [question, setQuestion] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!question.trim() || disabled || loading) return;
    onAsk(question.trim());
  };

  return (
    <div className="panel query-panel">
      <div className="panel-header">
        <h2>Ask the Document</h2>
      </div>
      <form onSubmit={submit} className="query-form">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={disabled ? "Waiting for ingestion to finish..." : "Ask a question about the VWO PRD..."}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || loading || !question.trim()}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>
      <div className="sample-questions">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            className="sample-question"
            disabled={disabled || loading}
            onClick={() => {
              setQuestion(q);
              onAsk(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
