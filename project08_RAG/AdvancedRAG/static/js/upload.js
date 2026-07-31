const DEFAULT_TEXT_COLS = ["title", "steps", "expected", "tags"];
const DEFAULT_META_COLS = ["id", "jira_id", "priority", "module"];

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) uploadFile(fileInput.files[0]);
});

async function uploadFile(file) {
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
  const label = el("label", { class: "col-check" }, [input, col]);
  return label;
}

document.getElementById("continue-btn")?.addEventListener("click", async () => {
  const text_cols = [...document.querySelectorAll('input[data-group="text"]:checked')].map((i) => i.value);
  const meta_cols = [...document.querySelectorAll('input[data-group="meta"]:checked')].map((i) => i.value);
  if (!text_cols.length) {
    alert("Pick at least one text column.");
    return;
  }
  await fetchJSON("/api/select-columns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text_cols, meta_cols }),
  });
  window.location.href = "/ingest";
});
