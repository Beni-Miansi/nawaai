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
  btn.querySelector(".btn-text").hidden    = on;
  btn.querySelector(".btn-spinner").hidden = !on;
}

function fieldErr(input, errEl, msg) {
  input.classList.add("is-error");
  if (errEl) errEl.textContent = msg;
}

function clearErrors() {
  document.querySelectorAll(".is-error").forEach(el => el.classList.remove("is-error"));
  document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
  document.getElementById("registerError").hidden = true;
}

// ── Formulaire inscription ─────────────────────
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const email = document.getElementById("regEmail").value.trim();
  const pwd   = document.getElementById("regPassword").value;
  const conf  = document.getElementById("regConfirm").value;
  const btn   = document.getElementById("registerBtn");
  let valid   = true;

  if (!email) {
    fieldErr(document.getElementById("regEmail"), document.getElementById("regEmailErr"), "L'email est requis.");
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErr(document.getElementById("regEmail"), document.getElementById("regEmailErr"), "Format d'email invalide.");
    valid = false;
  }

  if (!pwd) {
    fieldErr(document.getElementById("regPassword"), document.getElementById("regPasswordErr"), "Le mot de passe est requis.");
    valid = false;
  } else if (pwd.length < 6) {
    fieldErr(document.getElementById("regPassword"), document.getElementById("regPasswordErr"), "Minimum 6 caractères.");
    valid = false;
  }

  if (!conf) {
    fieldErr(document.getElementById("regConfirm"), document.getElementById("regConfirmErr"), "Veuillez confirmer le mot de passe.");
    valid = false;
  } else if (pwd !== conf) {
    fieldErr(document.getElementById("regConfirm"), document.getElementById("regConfirmErr"), "Les mots de passe ne correspondent pas.");
    valid = false;
  }

  if (!valid) return;

  setLoading(btn, true);
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de créer le compte.");

    // Transition fluide avant redirection
    document.body.style.transition = "opacity 0.3s ease";
    document.body.style.opacity    = "0";
    setTimeout(() => window.location.replace("/chat.html"), 300);
  } catch (err) {
    setLoading(btn, false);
    const alertEl = document.getElementById("registerError");
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
