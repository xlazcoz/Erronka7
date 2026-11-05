let usuarioActual = null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

document.addEventListener("DOMContentLoaded", () => {
  cargarPerfil();

  document.getElementById("perfilForm").addEventListener("submit", cambios);
  document.getElementById("passwordForm").addEventListener("submit", cambiarPassword);
});

async function cargarPerfil() {
  try {
    usuarioActual = await apiRequest("/login/me");
    renderizarPerfil();
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "Login.html?next=Erabiltzailea.html";
      return;
    }
    await mostrarDialogo(`Ezin izan da profila kargatu: ${error.message}`, {
      title: "Errorea profila kargatzean",
      type: "error",
    });
  }
}

function renderizarPerfil() {
  const nombreCompleto = `${usuarioActual.izena || ""} ${usuarioActual.abizena || ""}`.trim();
  document.getElementById("izena").textContent = nombreCompleto || "Nire kontua";
  document.getElementById("profileEmail").textContent = usuarioActual.login_email || "";
  document.getElementById("profileRole").textContent =
    usuarioActual.rola === "admin"
      ? "Administratzaile orokorra"
      : usuarioActual.rola === "udalerri_admin"
        ? `Udalerri-administratzailea${usuarioActual.udalerria_izena ? ` · ${usuarioActual.udalerria_izena}` : ""}`
        : "Erabiltzailea";

  const initials = `${usuarioActual.izena || ""} ${usuarioActual.abizena || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  document.getElementById("profileAvatar").textContent = initials || "E";

  document.getElementById("nombreform").value = usuarioActual.izena || "";
  document.getElementById("apellidoform").value = usuarioActual.abizena || "";
  document.getElementById("emailform").value = usuarioActual.login_email || "";
}

function showFeedback(elementId, message, type = "error") {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `pb-feedback is-visible pb-feedback-${type} mb-4`;
}

function clearFeedback(elementId) {
  const element = document.getElementById(elementId);
  element.textContent = "";
  element.className = "pb-feedback mb-4";
}

function setLoading(button, loading) {
  button.disabled = loading;
  button.querySelector(".pb-spinner")?.classList.toggle("d-none", !loading);
}

async function cambios(event) {
  event.preventDefault();
  clearFeedback("profileFeedback");

  const nombre = document.getElementById("nombreform").value.trim();
  const apellido = document.getElementById("apellidoform").value.trim();
  const email = document.getElementById("emailform").value.trim();

  if (nombre.length < 2) {
    showFeedback("profileFeedback", "Izenak gutxienez 2 karaktere izan behar ditu.");
    return;
  }
  if (!EMAIL_REGEX.test(email)) {
    showFeedback("profileFeedback", "Helbide elektronikoak ez du formatu baliozkoa.");
    return;
  }

  const button = document.getElementById("btnGuardar");
  setLoading(button, true);

  try {
    usuarioActual = await apiRequest("/login/me", {
      method: "PATCH",
      body: {
        izena: nombre,
        abizena: apellido,
        login_email: email,
      },
    });
    renderizarPerfil();
    showFeedback("profileFeedback", "Profila behar bezala eguneratu da.", "success");
  } catch (error) {
    showFeedback("profileFeedback", `Ezin izan dira aldaketak gorde: ${error.message}`);
  } finally {
    setLoading(button, false);
  }
}

async function cambiarPassword(event) {
  event.preventDefault();
  clearFeedback("securityFeedback");

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const repeatNewPassword = document.getElementById("repeatNewPassword").value;

  if (!currentPassword) {
    showFeedback("securityFeedback", "Idatzi oraingo pasahitza.");
    return;
  }
  if (newPassword.length < 8) {
    showFeedback("securityFeedback", "Pasahitz berriak gutxienez 8 karaktere izan behar ditu.");
    return;
  }
  if (newPassword !== repeatNewPassword) {
    showFeedback("securityFeedback", "Pasahitz berriak ez datoz bat.");
    return;
  }

  const button = document.getElementById("btnCambiarPassword");
  setLoading(button, true);

  try {
    await apiRequest("/login/password", {
      method: "PATCH",
      body: {
        current_password: currentPassword,
        new_password: newPassword,
      },
    });
    document.getElementById("passwordForm").reset();
    showFeedback("securityFeedback", "Pasahitza behar bezala aldatu da.", "success");
  } catch (error) {
    showFeedback("securityFeedback", `Ezin izan da pasahitza aldatu: ${error.message}`);
  } finally {
    setLoading(button, false);
  }
}
