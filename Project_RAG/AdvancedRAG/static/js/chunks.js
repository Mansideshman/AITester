let page = 0;
let debounceTimer = null;

const searchBox = document.getElementById("search-box");
const priorityFilter = document.getElementById("filter-priority");
const moduleFilter = document.getElementById("filter-module");
const jiraFilter = document.getElementById("filter-jira");

async function loadFacets() {
  const facets = await fetchJSON("/api/chunks/facets");
  for (const p of facets.priority) priorityFilter.appendChild(el("option", { value: p }, p));
  for (const m of facets.module) moduleFilter.appendChild(el("option", { value: m }, m));
}

function currentFilters() {
  return {
    search: searchBox.value.trim(),
    priority: priorityFilter.value,
    module: moduleFilter.value,
    jira_id: jiraFilter.value.trim(),
  };
}

async function loadChunks() {
  const f = currentFilters();
  const params = new URLSearchParams({ page: String(page), ...f });
  const data = await fetchJSON(`/api/chunks?${params.toString()}`);
  renderChunks(data);
}

function renderChunks(data) {
  const list = document.getElementById("chunk-list");
  list.innerHTML = "";
  if (!data.chunks.length) {
    list.appendChild(el("div", { class: "card" }, el("div", { class: "empty-state" }, "No chunks match. Ingest a corpus first or adjust filters.")));
  }
  for (const c of data.chunks) {
    const metaBadges = Object.entries(c.meta)
      .filter(([k]) => k !== "row_index" && k !== "chunk_index_in_row")
      .map(([k, v]) => el("span", { class: "badge" }, `${k}: ${v}`));
    const densePreview = c.dense_preview.length
      ? el("div", { class: "mono" }, `dense[0:8]: [${c.dense_preview.join(", ")}, …]`)
      : null;
    const sparsePreview = c.sparse_preview.length
      ? el("div", { class: "pill-row" }, c.sparse_preview.map((t) => el("span", { class: "pill" }, `${t.token} · ${t.weight}`)))
      : null;
    const card = el("div", { class: `chunk-card${c.used_in_last_answer ? " highlight" : ""}` }, [
      el("div", { class: "chunk-meta" }, [
        el("span", { class: "badge badge-coral" }, `chunk ${c.id}`),
        ...metaBadges,
        c.used_in_last_answer ? el("span", { class: "badge badge-good" }, "used in last answer") : null,
      ]),
      el("div", { class: "mono", style: "margin-bottom:8px" }, c.text),
      densePreview,
      sparsePreview,
    ]);
    list.appendChild(card);
  }
  document.getElementById("page-info").textContent = `Page ${page + 1} · ${data.total} total chunks`;
  document.getElementById("prev-page").disabled = page === 0;
  document.getElementById("next-page").disabled = (page + 1) * data.page_size >= data.total;
}

function debouncedReload() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { page = 0; loadChunks(); }, 300);
}

searchBox.addEventListener("input", debouncedReload);
priorityFilter.addEventListener("change", debouncedReload);
moduleFilter.addEventListener("change", debouncedReload);
jiraFilter.addEventListener("input", debouncedReload);
document.getElementById("clear-filters").addEventListener("click", () => {
  searchBox.value = ""; priorityFilter.value = ""; moduleFilter.value = ""; jiraFilter.value = "";
  page = 0; loadChunks();
});
document.getElementById("prev-page").addEventListener("click", () => { if (page > 0) { page--; loadChunks(); } });
document.getElementById("next-page").addEventListener("click", () => { page++; loadChunks(); });

loadFacets();
loadChunks();
