const chatLog = document.getElementById("chat-log");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatScroll = document.getElementById("chat-scroll");

function scrollToBottom() {
  chatScroll.scrollTop = chatScroll.scrollHeight;
}

function renderMarkdownLite(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "&bull; $1");
}

function addMessage(role, html) {
  document.getElementById("chat-empty")?.remove();
  const bubble = el("div", { class: `msg msg-${role}`, html });
  chatLog.appendChild(bubble);
  scrollToBottom();
}

function renderRetrieved(chunks) {
  const rows = chunks.map((c) =>
    el("div", { class: "chunk-card", style: "margin-bottom:6px;padding:8px 10px" }, [
      el("div", { class: "chunk-meta" }, [
        el("span", { class: "badge badge-coral" }, `chunk ${c.id}`),
        el("span", { class: "badge" }, `score ${c.score}`),
      ]),
      el("div", { class: "mono" }, c.text),
    ])
  );
  return el("div", { class: "card" }, [el("h3", {}, "Retrieved chunks"), ...rows]);
}

async function sendMessage() {
  const question = chatInput.value.trim();
  if (!question) return;
  addMessage("user", escapeHtml(question));
  chatInput.value = "";
  chatSend.disabled = true;

  const thinking = el("div", { class: "msg msg-assistant" }, "Retrieving & generating…");
  chatLog.appendChild(thinking);
  scrollToBottom();

  try {
    const data = await fetchJSON("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    thinking.remove();
    addMessage("assistant", renderMarkdownLite(data.answer));
    chatLog.appendChild(renderRetrieved(data.retrieved_chunks));
    scrollToBottom();
  } catch (e) {
    thinking.remove();
    addMessage("assistant", `⚠ ${escapeHtml(e.message)}`);
  } finally {
    chatSend.disabled = false;
  }
}

chatSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
