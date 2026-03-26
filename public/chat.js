// ── Vérifier si connecté, sinon rediriger ──────
(async () => {
  try {
    const res  = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    // Afficher l'email dans la sidebar
    const email = data.user?.email || "";
    document.getElementById("userEmail").textContent  = email;
    document.getElementById("userAvatar").textContent = email.charAt(0).toUpperCase() || "U";
  } catch {
    window.location.replace("/index.html");
    return;
  }

  await loadTemplates();
  await loadHistory();
})();

// ── API helper ─────────────────────────────────
async function api(path, options = {}) {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

// ── Templates ──────────────────────────────────
const templateEl = document.getElementById("template");
const currentMode= document.getElementById("currentMode");

async function loadTemplates() {
  try {
    const data = await api("/api/templates");
    templateEl.innerHTML = "";
    data.templates.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      templateEl.appendChild(opt);
    });
    updateMode();
  } catch (err) {
    console.warn("Templates non chargés :", err.message);
  }
}

function updateMode() {
  const sel = templateEl.options[templateEl.selectedIndex];
  if (sel) currentMode.textContent = sel.textContent;
}

templateEl.addEventListener("change", updateMode);

// ── Historique ─────────────────────────────────
const chatEl     = document.getElementById("chat");
const emptyState = document.getElementById("emptyState");

async function loadHistory() {
  try {
    const data    = await api("/api/history");
    const history = data.history || [];
    chatEl.innerHTML = "";
    if (history.length) {
      emptyState.style.display = "none";
      history.forEach(m => appendMessage(m.role, m.content, false));
      chatEl.scrollTop = chatEl.scrollHeight;
    } else {
      emptyState.style.display = "";
    }
  } catch {
    setStatus("Impossible de charger l'historique.", true);
  }
}

async function clearHistory() {
  await api("/api/history/clear", { method: "POST" });
  chatEl.innerHTML = "";
  emptyState.style.display = "";
  setStatus("Historique effacé.");
}

document.getElementById("clearHistory").addEventListener("click", clearHistory);
document.getElementById("newChatBtn").addEventListener("click",   clearHistory);

// ── Déconnexion ────────────────────────────────
document.getElementById("logout").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  document.body.style.transition = "opacity 0.3s ease";
  document.body.style.opacity    = "0";
  setTimeout(() => window.location.replace("/index.html"), 300);
});

// ── Titre de conversation ──────────────────────
const conversationTitleEl = document.getElementById("conversationTitle");

function setConversationTitle(title) {
  if (!title) return;
  conversationTitleEl.textContent = title;
  conversationTitleEl.hidden = false;
}

// ── Markdown ───────────────────────────────────
function renderMarkdown(raw) {
  if (!raw) return "";
  let t = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang || "text"}">${code.trim()}</code></pre>`
  );
  t = t.replace(/`([^`\n]+)`/g, '<span class="inline-code">$1</span>');
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  t = t.replace(/\*\*([^*]+)\*\*/g,     "<strong>$1</strong>");
  t = t.replace(/\*([^*\n]+)\*/g,       "<em>$1</em>");
  t = t.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  t = t.replace(/^## (.+)$/gm,  "<h2>$1</h2>");
  t = t.replace(/^# (.+)$/gm,   "<h1>$1</h1>");
  t = t.replace(/^---$/gm, "<hr>");
  t = t.replace(/^[-*] (.+)$/gm,  "<li>$1</li>");
  t = t.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  t = t.replace(/(<li>.*?<\/li>\n?)+/gs, m => `<ul>${m}</ul>`);
  t = t.split(/\n{2,}/).map(block => {
    if (/^<(h[1-3]|ul|ol|li|pre|hr)/.test(block.trim())) return block;
    return `<p>${block.replace(/\n/g, "<br>")}</p>`;
  }).join("");
  return t;
}

// ── Afficher un message ────────────────────────
function formatTime(d = new Date()) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const avatarInitial = document.getElementById("userAvatar");

function buildMessageShell(role, animate) {
  emptyState.style.display = "none";
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  if (!animate) msg.style.animation = "none";

  const av = document.createElement("div");
  av.className = "msg-avatar";
  av.textContent = role === "user" ? (avatarInitial?.textContent || "V") : "✦";

  const body  = document.createElement("div");
  body.className = "msg-body";

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.innerHTML = `<span>${role === "user" ? "Vous" : "NexaAI"}</span><span>·</span><span>${formatTime()}</span>`;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  body.appendChild(meta);
  body.appendChild(bubble);
  msg.appendChild(av);
  msg.appendChild(body);
  chatEl.appendChild(msg);
  return bubble;
}

function addCopyButton(bubble, text) {
  const copy = document.createElement("button");
  copy.className = "copy-btn";
  copy.textContent = "Copier";
  copy.addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(() => {
      copy.textContent = "✓ Copié !";
      setTimeout(() => { copy.textContent = "Copier"; }, 2000);
    });
  });
  bubble.appendChild(copy);
}

function appendMessage(role, text, animate = true) {
  const bubble = buildMessageShell(role, animate);
  bubble.innerHTML = renderMarkdown(text);
  if (role === "assistant") addCopyButton(bubble, text);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Crée une bulle vide pour le streaming, retourne la référence
function appendStreamingMessage() {
  const bubble = buildMessageShell("assistant", true);
  bubble.classList.add("streaming");
  bubble.innerHTML = '<span class="stream-cursor"></span>';
  chatEl.scrollTop = chatEl.scrollHeight;
  return bubble;
}

// Finalise la bulle une fois le stream terminé
function finalizeStreamingMessage(bubble, fullText) {
  bubble.classList.remove("streaming");
  bubble.innerHTML = renderMarkdown(fullText);
  addCopyButton(bubble, fullText);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// ── Statut ────────────────────────────────────
const statusBar = document.getElementById("statusBar");

function setStatus(text, isError = false) {
  statusBar.textContent = text;
  statusBar.style.color = isError ? "var(--red)" : "var(--text3)";
}

// ── Envoi de message ───────────────────────────
const inputEl         = document.getElementById("input");
const sendBtn         = document.getElementById("sendBtn");
const charCount       = document.getElementById("charCount");
const typingIndicator = document.getElementById("typingIndicator");
const modelEl         = document.getElementById("model");
const temperatureEl   = document.getElementById("temperature");
const temperatureVal  = document.getElementById("temperatureValue");
const languageEl      = document.getElementById("language");

let isSending = false;

function getConfig() {
  return {
    templateId:  templateEl.value,
    model:       modelEl.value,
    temperature: Number(temperatureEl.value),
    language:    languageEl.value,
  };
}

async function sendMessage(text) {
  if (isSending) return;
  isSending = true;
  sendBtn.disabled = true;
  typingIndicator.hidden = false;
  chatEl.scrollTop = chatEl.scrollHeight;
  setStatus("Génération en cours…");

  let fullText = "";
  let streamBubble = null;

  // Longer delays to handle Render.com free-tier cold starts (can take 30-60s)
  const RETRY_DELAYS = [3000, 6000, 15000, 30000];

  try {
    let response;
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: text, config: getConfig() }),
        });
      } catch (networkErr) {
        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt];
          setStatus(`Connexion perdue, nouvelle tentative dans ${delay / 1000}s… (${attempt + 1}/${RETRY_DELAYS.length})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw networkErr;
      }

      if (response.status === 502 || response.status === 503) {
        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt];
          setStatus(`Le serveur se réveille, nouvelle tentative dans ${delay / 1000}s… (${attempt + 1}/${RETRY_DELAYS.length})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // All retries exhausted for 502/503
        throw new Error("Le serveur est temporairement indisponible. Veuillez réessayer dans quelques instants.");
      }

      break; // success or non-retryable error
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Erreur ${response.status}`);
    }

    typingIndicator.hidden = true;
    streamBubble = appendStreamingMessage();

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop();

      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const data = JSON.parse(part.slice(6));
        if (data.error) throw new Error(data.error);
        if (data.token) {
          fullText += data.token;
          streamBubble.innerHTML = escapeHtml(fullText) + '<span class="stream-cursor"></span>';
          chatEl.scrollTop = chatEl.scrollHeight;
        }
        if (data.done) {
          finalizeStreamingMessage(streamBubble, fullText);
          if (data.title) setConversationTitle(data.title);
        }
      }
    }
    setStatus("");
  } catch (err) {
    typingIndicator.hidden = true;
    const errText = `Désolé, une erreur est survenue : **${err.message}**. Veuillez réessayer.`;
    if (streamBubble) {
      finalizeStreamingMessage(streamBubble, fullText || errText);
    } else {
      appendMessage("assistant", errText);
    }
    setStatus(err.message, true);
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function autoResize() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
  charCount.textContent = inputEl.value.length;
}

function handleSubmit() {
  const text = inputEl.value.trim();
  if (!text || isSending) return;
  appendMessage("user", text);
  inputEl.value = "";
  inputEl.style.height = "auto";
  charCount.textContent = "0";
  sendMessage(text);
}

inputEl.addEventListener("input",   autoResize);
sendBtn.addEventListener("click",   handleSubmit);
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
});

// ── Boutons rapides ────────────────────────────
document.querySelectorAll(".quick-card").forEach(btn => {
  btn.addEventListener("click", () => {
    inputEl.value = btn.dataset.prompt;
    autoResize();
    inputEl.focus();
  });
});

// ── Slider température ─────────────────────────
temperatureEl.addEventListener("input", () => {
  temperatureVal.textContent = Number(temperatureEl.value).toFixed(2);
  const pct = Number(temperatureEl.value) * 100;
  temperatureEl.style.background = `linear-gradient(to right, var(--indigo) 0%, var(--indigo) ${pct}%, var(--border2) ${pct}%)`;
});

// ── Recherche ──────────────────────────────────
const searchInput = document.getElementById("searchInput");
let searchTimeout = null;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const q = searchInput.value.trim();
    if (!q || q.length < 2) {
      loadHistory();
      return;
    }
    try {
      const data = await api(`/api/history/search?q=${encodeURIComponent(q)}`);
      const results = data.results || [];
      chatEl.innerHTML = "";
      emptyState.style.display = "none";
      if (results.length === 0) {
        chatEl.innerHTML = '<p class="search-empty">Aucun résultat pour cette recherche.</p>';
      } else {
        results.forEach(m => appendMessage(m.role, m.content, false));
        chatEl.scrollTop = chatEl.scrollHeight;
      }
    } catch {
      setStatus("Erreur lors de la recherche.", true);
    }
  }, 350);
});

// ── Sidebar mobile ─────────────────────────────
const sidebar        = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuToggle     = document.getElementById("menuToggle");

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
  sidebarOverlay.hidden = !sidebar.classList.contains("is-open");
});

sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("is-open");
  sidebarOverlay.hidden = true;
});
