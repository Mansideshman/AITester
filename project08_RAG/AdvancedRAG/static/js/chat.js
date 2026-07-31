const chatLog = document.getElementById("chat-log");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatScroll = document.getElementById("chat-scroll");

function resetStages() {
  document.querySelectorAll(".stage").forEach((s) => s.classList.remove("active", "done", "error"));
  document.querySelectorAll("[data-detail]").forEach((d) => { d.textContent = ""; });
}

function setStage(name, status) {
  const node = document.querySelector(`.stage[data-stage="${name}"]`);
  if (node) node.classList.remove("active", "done", "error"), node.classList.add(status);
}

function scrollToBottom() {
  chatScroll.scrollTop = chatScroll.scrollHeight;
}

function renderMarkdownLite(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "&bull; $1");
}

function addMessage(role, text) {
  document.getElementById("chat-empty")?.remove();
  const bubble = el("div", { class: `msg msg-${role}`, html: role === "assistant" ? renderMarkdownLite(text) : escapeHtml(text) });
  chatLog.appendChild(bubble);
  scrollToBottom();
  return bubble;
}

function hitRow(h) {
  return el("div", { class: "chunk-card", style: "margin-bottom:6px;padding:8px 10px" }, [
    el("div", { class: "chunk-meta" }, [
      el("span", { class: "badge badge-coral" }, `chunk ${h.id}`),
      el("span", { class: "badge" }, `score ${h.score}`),
    ]),
    el("div", { class: "mono" }, h.text),
  ]);
}

function renderPipelineDetail(t) {
  const rewriteSection = el("div", {}, [
    el("h3", {}, `Query rewrites${t.mode === "generate" ? " · mode: generate" : " · mode: answer"}`),
    el("div", { class: "pill-row" }, t.rewrites.map((r) => el("span", { class: "pill" }, r))),
  ]);

  const retrieveSection = el("div", { style: "margin-top:16px" }, [
    el("h3", {}, "Retrieval (dense vs sparse vs RRF-fused)"),
    el("div", { class: "grid-2" }, [
      el("div", {}, [el("div", { class: "badge" }, "Dense top-N"), ...t.dense_top.slice(0, 5).map(hitRow)]),
      el("div", {}, [el("div", { class: "badge" }, "Sparse top-N"), ...t.sparse_top.slice(0, 5).map(hitRow)]),
    ]),
    el("div", { style: "margin-top:10px" }, [el("div", { class: "badge badge-coral" }, "RRF fused top-N"), ...t.fused_top.slice(0, 5).map(hitRow)]),
  ]);

  const afterIds = new Set(t.rerank_after.map((h) => h.id));
  const rerankSection = el("div", { style: "margin-top:16px" }, [
    el("h3", {}, "Rerank (before → after)"),
    el("div", { class: "grid-2" }, [
      el("div", {}, [el("div", { class: "badge" }, "Before (fused order)"), ...t.rerank_before.slice(0, 6).map((h) =>
        el("div", { class: `chunk-card${afterIds.has(h.id) ? " highlight" : ""}`, style: "margin-bottom:6px;padding:8px 10px" }, [
          el("div", { class: "chunk-meta" }, [el("span", { class: "badge" }, `chunk ${h.id}`), el("span", { class: "badge" }, `score ${h.score}`)]),
          el("div", { class: "mono" }, h.text),
        ])
      )]),
      el("div", {}, [el("div", { class: "badge badge-coral" }, "After rerank (final)"), ...t.rerank_after.map(hitRow)]),
    ]),
  ]);

  return el("div", { class: "card" }, [rewriteSection, retrieveSection, rerankSection]);
}

async function sendMessage() {
  const question = chatInput.value.trim();
  if (!question) return;
  addMessage("user", question);
  chatInput.value = "";
  chatSend.disabled = true;
  resetStages();

  const turn = {};
  try {
    await streamPost("/api/chat", { question }, {
      stage: (d) => {
        setStage(d.stage, d.status === "running" ? "active" : "done");
        if (d.stage === "rewrite" && d.status === "done") {
          turn.rewrites = d.rewrites; turn.mode = d.mode;
          document.querySelector('[data-detail="rewrite"]').textContent = `${d.rewrites.length} variants`;
        }
        if (d.stage === "retrieve" && d.status === "done") {
          turn.dense_top = d.dense_top; turn.sparse_top = d.sparse_top; turn.fused_top = d.fused_top;
          document.querySelector('[data-detail="retrieve"]').textContent = `${d.fused_top.length} fused candidates`;
        }
        if (d.stage === "rerank" && d.status === "done") {
          turn.rerank_before = d.before; turn.rerank_after = d.after;
          document.querySelector('[data-detail="rerank"]').textContent = `top ${d.after.length} kept`;
        }
        if (d.stage === "generate" && d.status === "done") {
          document.querySelector('[data-detail="generate"]').textContent = d.mode;
          addMessage("assistant", d.answer);
          chatLog.appendChild(renderPipelineDetail(turn));
          scrollToBottom();
          chatSend.disabled = false;
        }
      },
      error: (d) => {
        addMessage("assistant", `⚠ ${d.message}`);
        chatSend.disabled = false;
      },
    });
  } catch (e) {
    addMessage("assistant", `⚠ ${e.message}`);
    chatSend.disabled = false;
  }
}

chatSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
