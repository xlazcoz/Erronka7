const loginContainer = document.getElementById("Login");
const registroContainer = document.getElementById("Registrarse");
const authFeedback = document.getElementById("authFeedback");
const authPanelEyebrow = document.getElementById("authPanelEyebrow");
const authPanelTitle = document.getElementById("authPanelTitle");
const authPanelSubtitle = document.getElementById("authPanelSubtitle");
const passwordStrengthBar = document.getElementById("passwordStrengthBar");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setMode(mode) {
  const isRegister = mode === "register";

  loginContainer.hidden = isRegister;
  registroContainer.hidden = !isRegister;

  document.querySelectorAll(".auth-switch-btn").forEach((button) => {
    const active = button.dataset.authMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  authPanelEyebrow.textContent = isRegister ? "Hasi doan" : "Ongi etorri berriro";
  authPanelTitle.textContent = isRegister ? "Sortu zure kontua" : "Hasi saioa";
  authPanelSubtitle.textContent = isRegister
    ? "Minutu bat baino gutxiago behar duzu erreserbatzen hasteko."
    : "Sartu zure erreserbak kudeatzeko.";

  clearFeedback();
  clearFieldErrors();
  try {
    history.replaceState(null, "", isRegister ? "#registro" : "#acceso");
  } catch (error) {
    // Algunos navegadores no permiten replaceState en file://.
  }

  const firstField = isRegister
    ? document.getElementById("registerName")
    : document.getElementById("Email");
  firstField?.focus();
}

function registrar() {
  setMode("register");
}

function iniciarSesion() {
  setMode("login");
}

function showFeedback(message, type = "error") {
  authFeedback.textContent = message;
  authFeedback.className = `pb-feedback is-visible pb-feedback-${type} mb-3`;
}

function clearFeedback() {
  authFeedback.textContent = "";
  authFeedback.className = "pb-feedback mb-3";
}

function clearFieldErrors() {
  document.querySelectorAll(".auth-field-error").forEach((element) => {
    element.textContent = "";
  });
  document.querySelectorAll(".auth-panel .form-control").forEach((element) => {
    element.classList.remove("is-invalid");
  });
}

function setFieldError(fieldId, message) {
  const error = document.querySelector(`[data-error-for="${fieldId}"]`);
  if (error) error.textContent = message;
  const input = document.getElementById(fieldId);
  if (input) input.classList.add("is-invalid");
}

function validateEmail(value) {
  return EMAIL_REGEX.test(value);
}

function validateLoginForm() {
  let valid = true;
  const email = document.getElementById("Email").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email) {
    setFieldError("Email", "Idatzi zure helbide elektronikoa.");
    valid = false;
  } else if (!validateEmail(email)) {
    setFieldError("Email", "Helbide elektronikoak ez du formatu baliozkoa.");
    valid = false;
  }

  if (!password) {
    setFieldError("loginPassword", "Idatzi zure pasahitza.");
    valid = false;
  }

  return valid;
}

function validateRegisterForm() {
  let valid = true;
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("Email2").value.trim();
  const password = document.getElementById("registerPassword").value;
  const repeatPassword = document.getElementById("repeatPassword").value;
  const terms = document.getElementById("registerTerms").checked;

  if (name.length < 2) {
    setFieldError("registerName", "Izenak gutxienez 2 karaktere izan behar ditu.");
    valid = false;
  }

  if (!email) {
    setFieldError("Email2", "Idatzi zure helbide elektronikoa.");
    valid = false;
  } else if (!validateEmail(email)) {
    setFieldError("Email2", "Helbide elektronikoak ez du formatu baliozkoa.");
    valid = false;
  }

  if (password.length < 8) {
    setFieldError("registerPassword", "Pasahitzak gutxienez 8 karaktere izan behar ditu.");
    valid = false;
  }

  if (repeatPassword !== password) {
    setFieldError("repeatPassword", "Pasahitzak ez datoz bat.");
    valid = false;
  }

  if (!terms) {
    setFieldError("registerTerms", "Erabilera-baldintzak onartu behar dituzu.");
    valid = false;
  }

  return valid;
}

function setLoading(button, loading) {
  button.disabled = loading;
  button.querySelector(".pb-spinner")?.classList.toggle("d-none", !loading);
}

document.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.authMode));
});

document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.togglePassword);
    if (!input) return;
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.setAttribute("aria-label", showing ? "Erakutsi pasahitza" : "Ezkutatu pasahitza");
    button.querySelector("i")?.classList.toggle("fa-eye", showing);
    button.querySelector("i")?.classList.toggle("fa-eye-slash", !showing);
  });
});

document.getElementById("registerPassword").addEventListener("input", (event) => {
  const value = event.target.value;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  passwordStrengthBar.style.width = `${Math.min(100, score * 25)}%`;
  passwordStrengthBar.dataset.strength = String(score);
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFeedback();
  clearFieldErrors();

  if (!validateLoginForm()) return;

  const submit = document.getElementById("loginSubmit");
  setLoading(submit, true);

  try {
    await apiRequest("/login", {
      method: "POST",
      body: {
        login_email: document.getElementById("Email").value.trim(),
        login_pasahitza: document.getElementById("loginPassword").value,
      },
    });

    const next = new URLSearchParams(window.location.search).get("next") || "index.html";
    window.location.href = next;
  } catch (error) {
    showFeedback(error.message || "Ezin izan da saioa hasi.");
    setLoading(submit, false);
  }
});

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFeedback();
  clearFieldErrors();

  if (!validateRegisterForm()) return;

  const submit = document.getElementById("registerSubmit");
  setLoading(submit, true);

  const credentials = {
    login_email: document.getElementById("Email2").value.trim(),
    login_pasahitza: document.getElementById("registerPassword").value,
  };

  try {
    await apiRequest("/login/register", {
      method: "POST",
      body: {
        izena: document.getElementById("registerName").value.trim(),
        abizena: document.getElementById("registerSurname").value.trim(),
        ...credentials,
      },
    });

    await apiRequest("/login", { method: "POST", body: credentials });
    window.location.href = "index.html";
  } catch (error) {
    showFeedback(error.message || "Ezin izan da kontua sortu.");
    setLoading(submit, false);
  }
});

setMode(window.location.hash === "#registro" ? "register" : "login");
