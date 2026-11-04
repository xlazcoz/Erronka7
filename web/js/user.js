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
    await mostrarDialogo(`No se pudo cargar el perfil: ${error.message}`, {
      title: "Error al cargar el perfil",
      type: "error",
    });
  }
}

function renderizarPerfil() {
  const nombreCompleto = `${usuarioActual.izena || ""} ${usuarioActual.abizena || ""}`.trim();
  document.getElementById("izena").textContent = nombreCompleto || "Mi cuenta";
  document.getElementById("profileEmail").textContent = usuarioActual.login_email || "";
  document.getElementById("profileRole").textContent =
    usuarioActual.rola === "admin"
      ? "Administrador general"
      : usuarioActual.rola === "udalerri_admin"
        ? `Administrador municipal${usuarioActual.udalerria_izena ? ` · ${usuarioActual.udalerria_izena}` : ""}`
        : "Usuario";

  const initials = `${usuarioActual.izena || ""} ${usuarioActual.abizena || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  document.getElementById("profileAvatar").textContent = initials || "U";

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
    showFeedback("profileFeedback", "El nombre debe tener al menos 2 caracteres.");
    return;
  }
  if (!EMAIL_REGEX.test(email)) {
    showFeedback("profileFeedback", "El correo no tiene un formato válido.");
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
    showFeedback("profileFeedback", "Perfil actualizado correctamente.", "success");
  } catch (error) {
    showFeedback("profileFeedback", `No se pudieron guardar los cambios: ${error.message}`);
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
    showFeedback("securityFeedback", "Escribe tu contraseña actual.");
    return;
  }
  if (newPassword.length < 8) {
    showFeedback("securityFeedback", "La nueva contraseña debe tener al menos 8 caracteres.");
    return;
  }
  if (newPassword !== repeatNewPassword) {
    showFeedback("securityFeedback", "Las nuevas contraseñas no coinciden.");
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
    showFeedback("securityFeedback", "Contraseña cambiada correctamente.", "success");
  } catch (error) {
    showFeedback("securityFeedback", `No se pudo cambiar la contraseña: ${error.message}`);
  } finally {
    setLoading(button, false);
  }
}
