const startBtn = document.getElementById("start-btn");
const resultsEl = document.getElementById("results");

function setStage(name, status) {
  const node = document.querySelector(`.stage[data-stage="${name}"]`);
  if (!node) return;
  node.classList.remove("active", "done", "error");
  node.classList.add(status);
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
  const denseStr = d.dense_preview.map((v) => v.toFixed(3)).join(", ");
  const sparseRows = d.sparse_preview.map((t) =>
    el("div", { class: "pill" }, `${t.token} · ${t.weight}`)
  );
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
      el("span", { class: "pill" }, `collection: vwo_test_cases`),
      el("span", { class: "pill" }, `${info.points_count} points`),
      el("span", { class: "pill" }, `status: ${info.status}`),
      el("span", { class: "pill" }, `vectors: ${info.vectors_config} + ${info.sparse_config}`),
    ]),
  ]);
  resultsEl.appendChild(card("Index", body));
}

startBtn?.addEventListener("click", async () => {
  startBtn.disabled = true;
  resultsEl.innerHTML = "";
  try {
    const { job_id } = await fetchJSON("/api/ingest/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    streamJob(`/api/ingest/stream/${job_id}`, {
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
        startBtn.disabled = false;
      },
    });
    setTimeout(() => { startBtn.disabled = false; }, 500);
  } catch (e) {
    alert(e.message);
    startBtn.disabled = false;
  }
});
