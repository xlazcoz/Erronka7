let usuarioActual = null;
let reservas = [];
let filtroReservas = "all";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

document.addEventListener("DOMContentLoaded", () => {
  cargarPerfil();

  document.getElementById("perfilForm").addEventListener("submit", cambios);
  document.getElementById("passwordForm").addEventListener("submit", cambiarPassword);
  document.getElementById("btnRefrescarReservas").addEventListener("click", cargarPerfil);

  document.querySelectorAll("[data-reservation-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      filtroReservas = button.dataset.reservationFilter;
      document.querySelectorAll("[data-reservation-filter]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderizarReservas();
    });
  });
});

async function cargarPerfil() {
  try {
    usuarioActual = await apiRequest("/login/me");
    reservas = usuarioActual.erreserbak || [];
    renderizarPerfil();
    renderizarReservas();
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
    reservas = usuarioActual.erreserbak || [];
    renderizarPerfil();
    renderizarReservas();
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

function estadoReserva(reserva) {
  if (reserva.egoera === "ezeztatua") {
    return { key: "cancelled", label: "Cancelada", badge: "pb-badge-muted" };
  }
  if (reserva.egoera === "amaitua") {
    return { key: "finished", label: "Finalizada", badge: "pb-badge-success" };
  }

  const now = new Date();
  const start = new Date(reserva.hasiera_data_ordua);
  const end = new Date(reserva.amaiera_data_ordua);

  if (now >= start && now <= end) {
    return { key: "active", label: "En curso", badge: "pb-badge-warning" };
  }
  return { key: "active", label: "Activa", badge: "pb-badge-primary" };
}

function formatearFechaHora(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearRango(reserva) {
  const start = new Date(reserva.hasiera_data_ordua);
  const end = new Date(reserva.amaiera_data_ordua);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${start.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} · ${start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(
      "es-ES",
      { hour: "2-digit", minute: "2-digit" },
    )}`;
  }

  return `${formatearFechaHora(reserva.hasiera_data_ordua)} → ${formatearFechaHora(reserva.amaiera_data_ordua)}`;
}

function formatearDuracion(reserva) {
  const start = new Date(reserva.hasiera_data_ordua);
  const end = new Date(reserva.amaiera_data_ordua);
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function crearElemento(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderizarReservas() {
  const lista = document.getElementById("reservasLista");
  lista.replaceChildren();

  const conteos = reservas.reduce(
    (acc, reserva) => {
      const estado = estadoReserva(reserva);
      acc.total += 1;
      if (estado.key === "active") acc.active += 1;
      if (estado.key === "finished") acc.finished += 1;
      if (estado.key === "cancelled") acc.cancelled += 1;
      return acc;
    },
    { total: 0, active: 0, finished: 0, cancelled: 0 },
  );

  document.getElementById("statTotal").textContent = conteos.total;
  document.getElementById("statActive").textContent = conteos.active;
  document.getElementById("statFinished").textContent = conteos.finished;
  document.getElementById("statCancelled").textContent = conteos.cancelled;

  const filtradas = reservas
    .filter((reserva) => {
      if (filtroReservas === "all") return true;
      return estadoReserva(reserva).key === filtroReservas;
    })
    .sort((a, b) => new Date(b.hasiera_data_ordua) - new Date(a.hasiera_data_ordua));

  if (filtradas.length === 0) {
    const empty = crearElemento("div", "pb-empty");
    const icon = crearElemento("i", "fas fa-calendar-days");
    const text = crearElemento(
      "p",
      "mb-3",
      reservas.length === 0
        ? "Todavía no tienes reservas. Busca una estación y reserva tu powerbank."
        : "No hay reservas con este filtro.",
    );
    const link = crearElemento("a", "btn btn-outline-primary btn-sm", "Buscar estación");
    link.href = "index.html";
    empty.append(icon, text, link);
    lista.appendChild(empty);
    return;
  }

  filtradas.forEach((reserva) => {
    const estado = estadoReserva(reserva);
    const card = crearElemento("article", "reservation-card");

    const icon = crearElemento("div", "reservation-icon");
    icon.innerHTML = '<i class="fas fa-battery-three-quarters"></i>';

    const main = crearElemento("div", "reservation-main");
    const title = crearElemento("div", "reservation-title");
    title.append(
      crearElemento("span", "", reserva.kargagunea_izena || `Estación #${reserva.kargagunea_id || "—"}`),
      crearElemento("span", `pb-badge ${estado.badge}`, estado.label),
    );

    const meta = crearElemento("div", "reservation-meta");
    meta.append(
      crearElemento("span", "", `Reserva #${reserva.id}`),
      crearElemento("span", "", reserva.karga_postua_izena || `Puesto #${reserva.hasierako_karga_postua}`),
      crearElemento("span", "", `Powerbank #${reserva.powerbank_id}`),
      crearElemento("span", "", `Duración: ${formatearDuracion(reserva)}`),
    );

    const fecha = crearElemento("div", "reservation-meta mt-1");
    fecha.append(crearElemento("span", "", formatearRango(reserva)));

    if (reserva.egoera === "amaitua" && reserva.amaitze_data_ordua) {
      const devuelto = crearElemento("div", "reservation-meta mt-1");
      const devueltoIcon = crearElemento("span", "", "");
      devueltoIcon.innerHTML = '<i class="fas fa-circle-check me-1"></i>';
      devuelto.append(devueltoIcon, crearElemento("span", "", `Devuelto: ${formatearFechaHora(reserva.amaitze_data_ordua)}`));
      main.append(title, meta, fecha, devuelto);
    } else {
      main.append(title, meta, fecha);
    }

    // Barra de progreso solo para reservas en curso.
    if (estado.label === "En curso") {
      const start = new Date(reserva.hasiera_data_ordua).getTime();
      const end = new Date(reserva.amaiera_data_ordua).getTime();
      const progress = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
      const bar = crearElemento("div", "reservation-progress");
      const fill = crearElemento("span");
      fill.style.width = `${progress}%`;
      bar.appendChild(fill);
      main.appendChild(bar);
    }

    const actions = crearElemento("div", "reservation-actions");
    const now = new Date();
    const start = new Date(reserva.hasiera_data_ordua);
    if (reserva.egoera === "aktiboa") {
      const qrButton = crearElemento("button", "btn btn-outline-secondary btn-sm", "Ver QR");
      qrButton.type = "button";
      qrButton.addEventListener("click", () => mostrarQR(reserva));
      actions.appendChild(qrButton);
    }

    if (reserva.egoera === "aktiboa" && now < start) {
      const cancel = crearElemento("button", "btn btn-outline-danger btn-sm", "Cancelar");
      cancel.type = "button";
      cancel.addEventListener("click", () => cancelarReserva(reserva.id));
      actions.appendChild(cancel);
    } else if (reserva.egoera === "aktiboa") {
      const returnButton = crearElemento("button", "btn btn-outline-primary btn-sm", "Devolver");
      returnButton.type = "button";
      returnButton.title = "Devolver la powerbank en la estación de recogida";
      returnButton.addEventListener("click", () => devolverReserva(reserva.id));
      actions.appendChild(returnButton);
    }

    card.append(icon, main, actions);
    lista.appendChild(card);
  });
}

function mostrarQR(reserva) {
  const container = document.getElementById("qrCode");
  const info = document.getElementById("qrInfo");
  container.replaceChildren();

  if (typeof QRCode === "undefined") {
    info.textContent = "No se pudo cargar el generador de QR.";
  } else {
    const contenido = `POWERBANK|RESERVA|${reserva.id}|${reserva.powerbank_id}`;
    new QRCode(container, {
      text: contenido,
      width: 220,
      height: 220,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
    info.textContent = `Reserva #${reserva.id} · ${reserva.kargagunea_izena || "Estación"} · ${formatearRango(reserva)}`;
  }

  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("qrModal"));
  modal.show();
}

async function devolverReserva(reservaId) {
  const confirmado = await confirmarDialogo(
    "¿Has terminado de usar la powerbank? Se devolverá en la estación de recogida.",
    { title: "Devolver powerbank" },
  );
  if (!confirmado) return;

  try {
    await apiRequest(`/erreserbak/${reservaId}/devolver`, { method: "PATCH" });
    await cargarPerfil();
    await mostrarDialogo("La powerbank se ha devuelto correctamente.", {
      title: "Devolución registrada",
      type: "success",
    });
  } catch (error) {
    await mostrarDialogo(`No se pudo registrar la devolución: ${error.message}`, {
      title: "Error al devolver",
      type: "error",
    });
  }
}

async function cancelarReserva(reservaId) {
  const confirmado = await confirmarDialogo("¿Quieres cancelar esta reserva?", {
    title: "Cancelar reserva",
  });
  if (!confirmado) return;

  try {
    await apiRequest(`/erreserbak/${reservaId}/egoera`, {
      method: "PATCH",
      body: { egoera: "ezeztatua" },
    });
    await cargarPerfil();
    await mostrarDialogo("La reserva se ha cancelado.", {
      title: "Reserva cancelada",
      type: "success",
    });
  } catch (error) {
    await mostrarDialogo(`No se pudo cancelar la reserva: ${error.message}`, {
      title: "Error al cancelar",
      type: "error",
    });
  }
}
