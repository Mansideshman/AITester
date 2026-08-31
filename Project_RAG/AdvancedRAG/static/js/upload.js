const DEFAULT_TEXT_COLS = ["title", "steps", "expected", "tags"];
const DEFAULT_META_COLS = ["id", "jira_id", "priority", "module"];

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const resultsEl = document.getElementById("results");
let selectedFile = null;

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  if (e.dataTransfer.files.length) previewFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) previewFile(fileInput.files[0]);
});

async function previewFile(file) {
  selectedFile = file;
  dropzone.innerHTML = `<div>Uploading ${escapeHtml(file.name)}…</div>`;
  const formData = new FormData();
  formData.append("file", file);
  try {
    const preview = await fetchJSON("/api/upload", { method: "POST", body: formData });
    dropzone.innerHTML = `<div>✓ ${escapeHtml(file.name)} — ${preview.row_count} rows</div><div style="font-size:12px;margin-top:6px">Click to replace</div>`;
    renderPreview(preview);
  } catch (e) {
    dropzone.innerHTML = `<div style="color:var(--bad)">${escapeHtml(e.message)}</div>`;
  }
}

function renderPreview(preview) {
  document.getElementById("preview-section").style.display = "block";
  document.getElementById("pill-rows").textContent = `${preview.row_count} rows`;
  document.getElementById("pill-cols").textContent = `${preview.columns.length} columns`;

  const table = document.getElementById("preview-table");
  const headRow = el("tr", {}, preview.columns.map((c) => el("th", {}, `${c} (${preview.dtypes[c]})`)));
  const bodyRows = preview.sample_rows.map((row) =>
    el("tr", {}, preview.columns.map((c) => el("td", {}, String(row[c] ?? "").slice(0, 80))))
  );
  table.innerHTML = "";
  table.appendChild(el("thead", {}, headRow));
  table.appendChild(el("tbody", {}, bodyRows));

  const textChecks = document.getElementById("text-col-checks");
  const metaChecks = document.getElementById("meta-col-checks");
  textChecks.innerHTML = "";
  metaChecks.innerHTML = "";
  for (const col of preview.columns) {
    textChecks.appendChild(makeCheckbox("text", col, DEFAULT_TEXT_COLS.includes(col)));
    metaChecks.appendChild(makeCheckbox("meta", col, DEFAULT_META_COLS.includes(col)));
  }
}

function makeCheckbox(group, col, checked) {
  const input = el("input", { type: "checkbox", value: col, "data-group": group });
  if (checked) input.checked = true;
  return el("label", { class: "col-check" }, [input, col]);
}

// ---------------- Ingestion (streamed) ----------------

function setStage(name, status) {
  const node = document.querySelector(`.stage[data-stage="${name}"]`);
  if (node) { node.classList.remove("active", "done", "error"); node.classList.add(status); }
}

function setDetail(name, text) {
  const node = document.querySelector(`[data-detail="${name}"]`);
  if (node) node.textContent = text;
}

function card(title, bodyNode) {
  return el("div", { class: "card" }, [el("h2", {}, title), bodyNode]);
}

function renderChunkCard(d) {
  const bars = d.histogram.map((count) =>
    el("div", { class: "bar", style: `height:${Math.max(4, (count / Math.max(...d.histogram, 1)) * 60)}px` })
  );
  const samples = d.samples.map((s) =>
    el("div", { class: "chunk-card" }, [
      el("div", { class: "chunk-meta" }, [el("span", { class: "badge" }, `chunk ${s.chunk_id}`)]),
      el("div", { class: "mono" }, s.text),
    ])
  );
  const body = el("div", {}, [
    el("div", { class: "pill-row" }, [
      el("span", { class: "pill" }, `${d.total_chunks} chunks`),
      el("span", { class: "pill" }, `avg ${d.avg_chars} chars`),
      el("span", { class: "pill" }, `min ${d.min_chars}`),
      el("span", { class: "pill" }, `max ${d.max_chars}`),
    ]),
    el("h3", {}, "Length distribution"),
    el("div", { class: "histogram" }, bars),
    el("h3", { style: "margin-top:16px" }, "Sample chunks"),
    ...samples,
  ]);
  resultsEl.appendChild(card("Chunk", body));
}

function renderEmbedCard(d) {
  if (d.note) {
    resultsEl.appendChild(card("Embed", el("p", { style: "color:var(--text-dim);font-size:13px" }, d.note)));
    return;
  }
  const denseStr = d.dense_preview.map((v) => v.toFixed(3)).join(", ");
  const sparseRows = d.sparse_preview.map((t) => el("div", { class: "pill" }, `${t.token} · ${t.weight}`));
  const body = el("div", {}, [
    el("h3", {}, "Dense vector preview (first 8 of 1024 dims)"),
    el("div", { class: "mono" }, `[${denseStr}, …]`),
    el("h3", { style: "margin-top:14px" }, "Sparse top-5 tokens by weight"),
    el("div", { class: "pill-row" }, sparseRows),
  ]);
  resultsEl.appendChild(card("Embed", body));
}

function renderIndexCard(d) {
  const info = d.collection;
  const body = el("div", {}, [
    el("div", { class: "pill-row" }, [
      el("span", { class: "pill" }, `${info.points_count} points`),
      el("span", { class: "pill" }, `status: ${info.status}`),
      el("span", { class: "pill" }, `vectors: ${info.vectors_config} + ${info.sparse_config}`),
    ]),
  ]);
  resultsEl.appendChild(card("Index", body));
}

document.getElementById("start-btn")?.addEventListener("click", async () => {
  if (!selectedFile) { alert("Pick a file first."); return; }
  const text_cols = [...document.querySelectorAll('input[data-group="text"]:checked')].map((i) => i.value);
  const meta_cols = [...document.querySelectorAll('input[data-group="meta"]:checked')].map((i) => i.value);
  if (!text_cols.length) { alert("Pick at least one text column."); return; }

  const startBtn = document.getElementById("start-btn");
  startBtn.disabled = true;
  resultsEl.innerHTML = "";
  document.getElementById("corpus-tracker").style.display = "none";
  document.getElementById("pipeline-tracker").style.display = "block";

  const formData = new FormData();
  formData.append("file", selectedFile);
  for (const c of text_cols) formData.append("text_cols", c);
  for (const c of meta_cols) formData.append("meta_cols", c);

  try {
    await streamPost("/api/ingest", formData, {
      stage: (d) => {
        setStage(d.stage, d.status === "running" ? "active" : "done");
        if (d.stage === "read" && d.status === "done") setDetail("read", `${d.row_count} rows`);
        if (d.stage === "build" && d.status === "done") setDetail("build", `${d.doc_count} docs`);
        if (d.stage === "chunk" && d.status === "done") { setDetail("chunk", `${d.total_chunks} chunks`); renderChunkCard(d); }
        if (d.stage === "embed" && d.status === "running") setDetail("embed", `0 / ${d.total}`);
        if (d.stage === "embed" && d.status === "done") { setDetail("embed", "done"); renderEmbedCard(d); }
        if (d.stage === "index" && d.status === "done") { setDetail("index", "ready"); renderIndexCard(d); refreshCorpusCard(); }
      },
      progress: (d) => {
        if (d.stage === "embed") {
          const pct = Math.round((d.done / d.total) * 100);
          document.querySelector('[data-progress="embed"]').style.width = `${pct}%`;
          setDetail("embed", `${d.done} / ${d.total}`);
        }
      },
      error: (d) => {
        resultsEl.appendChild(el("div", { class: "card", style: "color:var(--bad)" }, `Error: ${d.message}`));
      },
    });
  } catch (e) {
    resultsEl.appendChild(el("div", { class: "card", style: "color:var(--bad)" }, `Error: ${e.message}`));
  } finally {
    startBtn.disabled = false;
  }
});
