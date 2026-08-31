// Shared helpers used across chat/chunks pages.

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
    valueEl.textContent = status.exists ? `${status.points_count} chunks indexed` : "not ingested yet";
  } catch (e) {
    valueEl.textContent = "unavailable";
  }
}

document.addEventListener("DOMContentLoaded", refreshCorpusCard);
