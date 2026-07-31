// Shared helpers used across upload/ingest/chunks/chat pages.

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function refreshCorpusCard() {
  const valueEl = document.getElementById("corpus-value");
  if (!valueEl) return;
  try {
    const status = await fetchJSON("/api/status");
    if (status.collection && status.collection.exists) {
      valueEl.textContent = `${status.collection.points_count} chunks indexed`;
    } else {
      valueEl.textContent = "not ingested yet";
    }
  } catch (e) {
    valueEl.textContent = "unavailable";
  }
}

document.addEventListener("DOMContentLoaded", refreshCorpusCard);

// Fires a POST request whose response body is an SSE-formatted stream, and
// dispatches parsed events to handlers as they arrive. Native EventSource
// can't POST a body, so this reads the fetch() stream directly instead —
// works identically for a plain Flask dev server and a Vercel Function.
async function streamPost(url, body, handlers) {
  const res = await fetch(url, {
    method: "POST",
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const eventMatch = block.match(/^event: (.+)$/m);
      const dataMatch = block.match(/^data: (.+)$/m);
      if (!eventMatch) continue;
      const eventName = eventMatch[1];
      const data = dataMatch ? JSON.parse(dataMatch[1]) : {};
      const handler = handlers[eventName];
      if (handler) handler(data);
    }
  }
}
