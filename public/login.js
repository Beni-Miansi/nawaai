// ── Vérifier si déjà connecté ──────────────────
(async () => {
  try {
    await fetch("/api/auth/me", { credentials: "include" }).then(r => {
      if (r.ok) window.location.replace("/chat.html");
    });
  } catch {}
})();

// ── Helpers ────────────────────────────────────
function setLoading(btn, on) {
  btn.disabled = on;
  btn.querySelector(".btn-text").hidden   = on;
  btn.querySelector(".btn-spinner").hidden = !on;
}

function fieldErr(input, errEl, msg) {
  input.classList.add("is-error");
  if (errEl) errEl.textContent = msg;
}

function clearErrors() {
  document.querySelectorAll(".is-error").forEach(el => el.classList.remove("is-error"));
  document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
  document.getElementById("loginError").hidden = true;
}

// ── Formulaire connexion ───────────────────────
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const email = document.getElementById("loginEmail").value.trim();
  const pwd   = document.getElementById("loginPassword").value;
  const btn   = document.getElementById("loginBtn");
  let valid   = true;

  if (!email) {
    fieldErr(document.getElementById("loginEmail"), document.getElementById("loginEmailErr"), "L'email est requis.");
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErr(document.getElementById("loginEmail"), document.getElementById("loginEmailErr"), "Format d'email invalide.");
    valid = false;
  }

  if (!pwd) {
    fieldErr(document.getElementById("loginPassword"), document.getElementById("loginPasswordErr"), "Le mot de passe est requis.");
    valid = false;
  }

  if (!valid) return;

  setLoading(btn, true);
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Identifiants incorrects.");

    // Transition fluide avant redirection
    document.body.style.transition = "opacity 0.3s ease";
    document.body.style.opacity    = "0";
    setTimeout(() => window.location.replace("/chat.html"), 300);
  } catch (err) {
    setLoading(btn, false);
    const alertEl = document.getElementById("loginError");
    alertEl.textContent = err.message;
    alertEl.hidden = false;
  }
});

// ── Afficher/masquer mot de passe ──────────────
document.querySelectorAll(".toggle-pwd").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === "password" ? "text" : "password";
  });
});
