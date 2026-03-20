// ══════════════════════════════════════════════
// DOM REFS
// ══════════════════════════════════════════════
const pageLogin    = document.getElementById("pageLogin");
const pageRegister = document.getElementById("pageRegister");
const pageApp      = document.getElementById("pageApp");

// Login
const loginForm     = document.getElementById("loginForm");
const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn      = document.getElementById("loginBtn");
const loginError    = document.getElementById("loginError");

// Register
const registerForm    = document.getElementById("registerForm");
const regEmail        = document.getElementById("regEmail");
const regPassword     = document.getElementById("regPassword");
const regConfirm      = document.getElementById("regConfirm");
const registerBtn     = document.getElementById("registerBtn");
const registerError   = document.getElementById("registerError");

// Navigation
const goToRegister = document.getElementById("goToRegister");
const goToLogin    = document.getElementById("goToLogin");

// App
const chatEl          = document.getElementById("chat");
const inputEl         = document.getElementById("input");
const sendBtn         = document.getElementById("sendBtn");
const statusBar       = document.getElementById("statusBar");
const typingIndicator = document.getElementById("typingIndicator");
const emptyState      = document.getElementById("emptyState");
const charCount       = document.getElementById("charCount");
const userEmail       = document.getElementById("userEmail");
const userAvatar      = document.getElementById("userAvatar");
const currentMode     = document.getElementById("currentMode");

const modelEl       = document.getElementById("model");
const temperatureEl = document.getElementById("temperature");
const temperatureVal= document.getElementById("temperatureValue");
const languageEl    = document.getElementById("language");
const templateEl    = document.getElementById("template");
const clearHistoryEl= document.getElementById("clearHistory");
const logoutEl      = document.getElementById("logout");
const newChatBtn    = document.getElementById("newChatBtn");
const menuToggle    = document.getElementById("menuToggle");
const sidebar       = document.getElementById("sidebar");
const sidebarOverlay= document.getElementById("sidebarOverlay");

let isSending = false;

// ══════════════════════════════════════════════
// PAGE NAVIGATION (avec transitions)
// ══════════════════════════════════════════════
function showPage(pageEl, { from } = {}) {
  return new Promise((resolve) => {
    // Masquer la page source avec animation
    if (from) {
      from.classList.add("page-exit");
      from.addEventListener("animationend", () => {
        from.hidden = true;
        from.classList.remove("page-exit");
      }, { once: true });
    }

    // Afficher la page cible avec animation
    setTimeout(() => {
      pageEl.hidden = false;
      pageEl.classList.add("page-enter");
      pageEl.addEventListener("animationend", () => {
        pageEl.classList.remove("page-enter");
        resolve();
      }, { once: true });
    }, from ? 150 : 0);
  });
}

function navigateTo(target) {
  const pages = [pageLogin, pageRegister, pageApp];
  const current = pages.find(p => !p.hidden);
  showPage(target, { from: current !== target ? current : null });
}

// ══════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════
function clearFieldErrors(fields) {
  fields.forEach(([input, errEl]) => {
    input.classList.remove("is-error");
    if (errEl) errEl.textContent = "";
  });
}

function setFieldError(input, errEl, msg) {
  input.classList.add("is-error");
  if (errEl) errEl.textContent = msg;
}

function showFormAlert(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

function hideFormAlert(el) {
  el.hidden = true;
  el.textContent = "";
}

// ══════════════════════════════════════════════
// API
// ══════════════════════════════════════════════
async function requestApi(path, options = {}) {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

function setLoading(btn, loading) {
  const text    = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".btn-spinner");
  btn.disabled = loading;
  if (text)    text.hidden = loading;
  if (spinner) spinner.hidden = !loading;
}

// ══════════════════════════════════════════════
// AUTH : CONNEXION
// ══════════════════════════════════════════════
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFormAlert(loginError);
  clearFieldErrors([
    [loginEmail,    document.getElementById("loginEmailErr")],
    [loginPassword, document.getElementById("loginPasswordErr")],
  ]);

  const email = loginEmail.value.trim();
  const pwd   = loginPassword.value;
  let valid   = true;

  if (!email) {
    setFieldError(loginEmail, document.getElementById("loginEmailErr"), "L'email est requis.");
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError(loginEmail, document.getElementById("loginEmailErr"), "Format d'email invalide.");
    valid = false;
  }

  if (!pwd) {
    setFieldError(loginPassword, document.getElementById("loginPasswordErr"), "Le mot de passe est requis.");
    valid = false;
  }

  if (!valid) return;

  setLoading(loginBtn, true);
  try {
    await requestApi("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });
    await enterApp(email);
  } catch (err) {
    showFormAlert(loginError, err.message);
    setLoading(loginBtn, false);
  }
});

// ══════════════════════════════════════════════
// AUTH : INSCRIPTION
// ══════════════════════════════════════════════
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFormAlert(registerError);
  clearFieldErrors([
    [regEmail,    document.getElementById("regEmailErr")],
    [regPassword, document.getElementById("regPasswordErr")],
    [regConfirm,  document.getElementById("regConfirmErr")],
  ]);

  const email = regEmail.value.trim();
  const pwd   = regPassword.value;
  const conf  = regConfirm.value;
  let valid   = true;

  if (!email) {
    setFieldError(regEmail, document.getElementById("regEmailErr"), "L'email est requis.");
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError(regEmail, document.getElementById("regEmailErr"), "Format d'email invalide.");
    valid = false;
  }

  if (!pwd) {
    setFieldError(regPassword, document.getElementById("regPasswordErr"), "Le mot de passe est requis.");
    valid = false;
  } else if (pwd.length < 6) {
    setFieldError(regPassword, document.getElementById("regPasswordErr"), "Minimum 6 caractères.");
    valid = false;
  }

  if (!conf) {
    setFieldError(regConfirm, document.getElementById("regConfirmErr"), "Veuillez confirmer le mot de passe.");
    valid = false;
  } else if (pwd !== conf) {
    setFieldError(regConfirm, document.getElementById("regConfirmErr"), "Les mots de passe ne correspondent pas.");
    valid = false;
  }

  if (!valid) return;

  setLoading(registerBtn, true);
  try {
    await requestApi("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });
    await enterApp(email);
  } catch (err) {
    showFormAlert(registerError, err.message);
    setLoading(registerBtn, false);
  }
});

// ══════════════════════════════════════════════
// NAVIGATION ENTRE PAGES AUTH
// ══════════════════════════════════════════════
goToRegister.addEventListener("click", () => navigateTo(pageRegister));
goToLogin.addEventListener("click",    () => navigateTo(pageLogin));

// ══════════════════════════════════════════════
// ENTRER DANS L'APP
// ══════════════════════════════════════════════
async function enterApp(email) {
  // Mettre à jour le profil utilisateur
  if (email) {
    userEmail.textContent = email;
    userAvatar.textContent = email.charAt(0).toUpperCase();
  }

  // Transition vers l'app
  const current = [pageLogin, pageRegister].find(p => !p.hidden);
  if (current) {
    current.classList.add("page-exit");
    await new Promise(r => setTimeout(r, 200));
    current.hidden = true;
    current.classList.remove("page-exit");
  }

  pageApp.hidden = false;
  pageApp.classList.add("page-enter");
  pageApp.addEventListener("animationend", () => {
    pageApp.classList.remove("page-enter");
  }, { once: true });

  await loadTemplates();
  await loadHistory();
}

// ══════════════════════════════════════════════
// DÉCONNEXION
// ══════════════════════════════════════════════
logoutEl.addEventListener("click", async () => {
  await requestApi("/api/auth/logout", { method: "POST" }).catch(() => {});

  pageApp.classList.add("page-exit");
  await new Promise(r => setTimeout(r, 250));
  pageApp.hidden = true;
  pageApp.classList.remove("page-exit");

  // Reset
  chatEl.innerHTML = "";
  emptyState.style.display = "";
  loginEmail.value = "";
  loginPassword.value = "";

  pageLogin.hidden = false;
  pageLogin.classList.add("page-enter");
  pageLogin.addEventListener("animationend", () => pageLogin.classList.remove("page-enter"), { once: true });
});

// ══════════════════════════════════════════════
// TEMPLATES
// ══════════════════════════════════════════════
async function loadTemplates() {
  try {
    const data = await requestApi("/api/templates");
    templateEl.innerHTML = "";
    data.templates.forEach((t) => {
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

// ══════════════════════════════════════════════
// HISTORIQUE
// ══════════════════════════════════════════════
async function loadHistory() {
  try {
    const data = await requestApi("/api/history");
    const history = data.history || [];
    chatEl.innerHTML = "";
    if (history.length) {
      emptyState.style.display = "none";
      history.forEach(m => appendMessage(m.role, m.content, false));
      chatEl.scrollTop = chatEl.scrollHeight;
    } else {
      emptyState.style.display = "";
    }
  } catch (err) {
    setStatus("Impossible de charger l'historique.", true);
  }
}

async function doClearHistory() {
  await requestApi("/api/history/clear", { method: "POST" });
  chatEl.innerHTML = "";
  emptyState.style.display = "";
  setStatus("Historique effacé.");
}

clearHistoryEl.addEventListener("click", doClearHistory);
newChatBtn.addEventListener("click",    doClearHistory);

// ══════════════════════════════════════════════
// MARKDOWN RENDERER
// ══════════════════════════════════════════════
function renderMarkdown(raw) {
  if (!raw) return "";
  let t = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Blocs de code
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang || "text"}">${code.trim()}</code></pre>`
  );

  // Code inline
  t = t.replace(/`([^`\n]+)`/g, '<span class="inline-code">$1</span>');

  // Gras et italique
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  t = t.replace(/\*\*([^*]+)\*\*/g,     "<strong>$1</strong>");
  t = t.replace(/\*([^*\n]+)\*/g,       "<em>$1</em>");

  // Titres
  t = t.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  t = t.replace(/^## (.+)$/gm,  "<h2>$1</h2>");
  t = t.replace(/^# (.+)$/gm,   "<h1>$1</h1>");

  // Séparateur
  t = t.replace(/^---$/gm, "<hr>");

  // Listes
  t = t.replace(/^[-*] (.+)$/gm,   "<li>$1</li>");
  t = t.replace(/^\d+\. (.+)$/gm,  "<li>$1</li>");
  t = t.replace(/(<li>.*?<\/li>\n?)+/gs, m => `<ul>${m}</ul>`);

  // Paragraphes
  t = t.split(/\n{2,}/).map(block => {
    if (/^<(h[1-3]|ul|ol|li|pre|hr)/.test(block.trim())) return block;
    return `<p>${block.replace(/\n/g, "<br>")}</p>`;
  }).join("");

  return t;
}

// ══════════════════════════════════════════════
// AFFICHER UN MESSAGE
// ══════════════════════════════════════════════
function formatTime(d = new Date()) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function appendMessage(role, text, animate = true) {
  emptyState.style.display = "none";

  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  if (!animate) msg.style.animation = "none";

  const avatarEl = document.createElement("div");
  avatarEl.className = "msg-avatar";
  avatarEl.textContent = role === "user" ? (userAvatar.textContent || "V") : "✦";

  const body = document.createElement("div");
  body.className = "msg-body";

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.innerHTML = `<span>${role === "user" ? "Vous" : "NexaAI"}</span> <span>·</span> <span>${formatTime()}</span>`;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerHTML = renderMarkdown(text);

  if (role === "assistant") {
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

  body.appendChild(meta);
  body.appendChild(bubble);
  msg.appendChild(avatarEl);
  msg.appendChild(body);
  chatEl.appendChild(msg);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// ══════════════════════════════════════════════
// STATUS
// ══════════════════════════════════════════════
function setStatus(text, isError = false) {
  statusBar.textContent = text;
  statusBar.style.color = isError ? "var(--red)" : "var(--text3)";
}

// ══════════════════════════════════════════════
// ENVOI DE MESSAGE
// ══════════════════════════════════════════════
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

  try {
    const data = await requestApi("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, config: getConfig() }),
    });
    typingIndicator.hidden = true;
    appendMessage("assistant", data.reply || "Aucune réponse reçue.");
    setStatus("");
  } catch (err) {
    typingIndicator.hidden = true;
    appendMessage("assistant", `Désolé, une erreur est survenue : **${err.message}**. Veuillez réessayer.`);
    setStatus(err.message, true);
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

// ══════════════════════════════════════════════
// INPUT
// ══════════════════════════════════════════════
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
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
});

// ══════════════════════════════════════════════
// BOUTONS RAPIDES
// ══════════════════════════════════════════════
document.querySelectorAll(".quick-card").forEach(btn => {
  btn.addEventListener("click", () => {
    const prompt = btn.dataset.prompt;
    inputEl.value = prompt;
    autoResize();
    inputEl.focus();
    inputEl.setSelectionRange(prompt.length, prompt.length);
  });
});

// ══════════════════════════════════════════════
// SLIDER TEMPÉRATURE
// ══════════════════════════════════════════════
temperatureEl.addEventListener("input", () => {
  temperatureVal.textContent = Number(temperatureEl.value).toFixed(2);
  const pct = (Number(temperatureEl.value) / 1) * 100;
  temperatureEl.style.background = `linear-gradient(to right, var(--indigo) 0%, var(--indigo) ${pct}%, var(--border2) ${pct}%)`;
});

// ══════════════════════════════════════════════
// AFFICHER/MASQUER MOT DE PASSE
// ══════════════════════════════════════════════
document.querySelectorAll(".toggle-pwd").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    btn.querySelector(".eye-icon").style.opacity = input.type === "text" ? "0.5" : "1";
  });
});

// ══════════════════════════════════════════════
// SIDEBAR MOBILE
// ══════════════════════════════════════════════
menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
  sidebarOverlay.hidden = !sidebar.classList.contains("is-open");
});

sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("is-open");
  sidebarOverlay.hidden = true;
});

// ══════════════════════════════════════════════
// INITIALISATION
// ══════════════════════════════════════════════
(async () => {
  try {
    const data = await requestApi("/api/auth/me");
    await enterApp(data.user?.email || "");
  } catch {
    // Utilisateur non connecté — afficher la page de connexion
    pageLogin.hidden = false;
    pageRegister.hidden = true;
    pageApp.hidden = true;
  }
})();
