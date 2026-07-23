const BASE = "/api";

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const getStatus = () => request("/status");
export const getChunks = () => request("/chunks");
export const triggerIngest = () => request("/ingest", { method: "POST" });
export const resetIngestion = () => request("/reset", { method: "POST" });
export const askQuestion = (question) =>
  request("/query", { method: "POST", body: JSON.stringify({ question }) });
