let cursorStack = ["0"];
let pageIndex = 0;
let nextCursor = null;

function renderChunks(data) {
  const list = document.getElementById("chunk-list");
  list.innerHTML = "";
  if (!data.chunks.length) {
    list.appendChild(el("div", { class: "card" }, el("div", { class: "empty-state" }, "No chunks indexed yet.")));
  }
  for (const c of data.chunks) {
    const metaBadges = Object.entries(c.meta)
      .filter(([k]) => k !== "text" && k !== "row_index")
      .map(([k, v]) => el("span", { class: "badge" }, `${k}: ${v}`));
    const card = el("div", { class: `chunk-card${c.used_in_last_answer ? " highlight" : ""}` }, [
      el("div", { class: "chunk-meta" }, [
        el("span", { class: "badge badge-coral" }, `chunk ${c.id}`),
        ...metaBadges,
        c.used_in_last_answer ? el("span", { class: "badge badge-good" }, "used in last answer") : null,
      ]),
      el("div", { class: "mono" }, c.text),
    ]);
    list.appendChild(card);
  }
  nextCursor = data.next_cursor;
  document.getElementById("page-info").textContent = `Page ${pageIndex + 1}`;
  document.getElementById("prev-page").disabled = pageIndex === 0;
  document.getElementById("next-page").disabled = !nextCursor;
}

async function loadPage(cursor) {
  const data = await fetchJSON(`/api/chunks?cursor=${encodeURIComponent(cursor)}`);
  renderChunks(data);
}

document.getElementById("prev-page").addEventListener("click", () => {
  if (pageIndex === 0) return;
  pageIndex--;
  loadPage(cursorStack[pageIndex]);
});

document.getElementById("next-page").addEventListener("click", () => {
  if (!nextCursor) return;
  pageIndex++;
  cursorStack[pageIndex] = nextCursor;
  loadPage(nextCursor);
});

loadPage(cursorStack[0]);
