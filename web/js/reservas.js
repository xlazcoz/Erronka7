let reservas = [];
let filtroReservas = "all";
let qrReservaActual = null;
let qrUrlActual = "";

document.addEventListener("DOMContentLoaded", () => {
  cargarReservas();
  document.getElementById("btnRefrescarReservas").addEventListener("click", refrescarReservas);
  document.getElementById("qrDownload")?.addEventListener("click", descargarQR);
  document.getElementById("qrPrint")?.addEventListener("click", imprimirQR);

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

async function cargarReservas() {
  try {
    const usuario = await apiRequest("/login/me");
    reservas = usuario.erreserbak || [];
    renderizarReservas();
    abrirQrDesdeUrl();
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "Login.html?next=Erreserbak.html";
      return;
    }
    await mostrarDialogo(`No se pudieron cargar las reservas: ${error.message}`, {
      title: "Error al cargar",
      type: "error",
    });
  }
}

function estadoReserva(reserva) {
  if (reserva.egoera === "ezeztatua") {
    return { key: "cancelled", label: "Cancelada", badge: "pb-badge-muted" };
  }

  const now = new Date();
  const start = new Date(reserva.hasiera_data_ordua);
  const end = new Date(reserva.amaiera_data_ordua);

  if (reserva.egoera === "amaitua") {
    if (!reserva.egikaritze_data_ordua) {
      return { key: "finished", label: "Expirada · no recogida", badge: "pb-badge-muted" };
    }
    if (reserva.berandu) {
      return { key: "finished", label: "Devuelta con retraso", badge: "pb-badge-warning" };
    }
    return { key: "finished", label: "Finalizada", badge: "pb-badge-success" };
  }

  if (reserva.egikaritze_data_ordua) {
    if (now > end) {
      return { key: "active", label: "En uso · devolución pendiente", badge: "pb-badge-danger" };
    }
    return { key: "active", label: "En uso", badge: "pb-badge-warning" };
  }

  if (now < start) {
    return { key: "active", label: "Activa", badge: "pb-badge-primary" };
  }
  if (now <= end) {
    return { key: "active", label: "Lista para recoger", badge: "pb-badge-warning" };
  }

  return { key: "finished", label: "Expirada · no recogida", badge: "pb-badge-muted" };
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

function crearMeta(icono, texto) {
  const span = crearElemento("span");
  const icon = crearElemento("i", `fas ${icono}`);
  span.append(icon, document.createTextNode(texto));
  return span;
}

async function refrescarReservas() {
  const boton = document.getElementById("btnRefrescarReservas");
  boton.classList.add("is-loading");
  try {
    await cargarReservas();
  } finally {
    boton.classList.remove("is-loading");
  }
}

function animarValor(elemento, valor) {
  if (!elemento) return;

  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducido) {
    elemento.textContent = valor;
    elemento.dataset.valor = String(valor);
    return;
  }

  const desde = Number(elemento.dataset.valor || 0);
  if (desde === valor) {
    elemento.textContent = valor;
    return;
  }

  const inicio = performance.now();
  const duracion = 700;

  const paso = (ahora) => {
    const progreso = Math.min(1, (ahora - inicio) / duracion);
    const suave = 1 - Math.pow(1 - progreso, 3);
    elemento.textContent = Math.round(desde + (valor - desde) * suave);
    if (progreso < 1) {
      requestAnimationFrame(paso);
    } else {
      elemento.dataset.valor = String(valor);
    }
  };

  requestAnimationFrame(paso);
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

  animarValor(document.getElementById("statTotal"), conteos.total);
  animarValor(document.getElementById("statActive"), conteos.active);
  animarValor(document.getElementById("statFinished"), conteos.finished);
  animarValor(document.getElementById("statCancelled"), conteos.cancelled);

  document.getElementById("countAll").textContent = conteos.total;
  document.getElementById("countActive").textContent = conteos.active;
  document.getElementById("countFinished").textContent = conteos.finished;
  document.getElementById("countCancelled").textContent = conteos.cancelled;

  const filtradas = reservas
    .filter((reserva) => filtroReservas === "all" || estadoReserva(reserva).key === filtroReservas)
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

  filtradas.forEach((reserva, indice) => {
    const estado = estadoReserva(reserva);
    const card = crearElemento("article", `reservation-card is-${estado.key}`);
    card.style.setProperty("--i", String(indice));

    const icon = crearElemento("div", "reservation-icon");
    icon.innerHTML = '<i class="fas fa-bolt"></i>';

    const main = crearElemento("div", "reservation-main");
    const title = crearElemento("div", "reservation-title");
    const badge = crearElemento("span", `pb-badge ${estado.badge}`);
    const dot = crearElemento("span", "status-dot");
    badge.append(dot, document.createTextNode(estado.label));
    title.append(
      crearElemento("span", "", reserva.kargagunea_izena || `Estación #${reserva.kargagunea_id || "—"}`),
      badge,
    );

    const meta = crearElemento("div", "reservation-meta");
    meta.append(
      crearMeta("fa-hashtag", `Reserva #${reserva.id}`),
      crearMeta("fa-plug", reserva.karga_postua_izena || `Puesto #${reserva.hasierako_karga_postua}`),
      crearMeta("fa-battery-full", `Powerbank #${reserva.powerbank_id}`),
      crearMeta("fa-clock", `Duración: ${formatearDuracion(reserva)}`),
    );

    const fecha = crearElemento("div", "reservation-meta mt-1");
    fecha.append(crearMeta("fa-calendar-days", formatearRango(reserva)));

    main.append(title, meta, fecha);

    if (reserva.egikaritze_data_ordua) {
      const recogido = crearElemento("div", "reservation-meta mt-1");
      recogido.append(crearMeta("fa-hand-holding", `Recogido: ${formatearFechaHora(reserva.egikaritze_data_ordua)}`));
      main.appendChild(recogido);
    }

    if (reserva.egoera === "amaitua" && reserva.amaitze_data_ordua && reserva.egikaritze_data_ordua) {
      const devuelto = crearElemento("div", "reservation-meta mt-1");
      devuelto.append(crearMeta("fa-circle-check", `Devuelto: ${formatearFechaHora(reserva.amaitze_data_ordua)}`));
      main.appendChild(devuelto);

      if (reserva.bukaerako_kargagunea_izena) {
        const lugar = crearElemento("div", "reservation-meta mt-1");
        lugar.append(crearMeta("fa-location-dot", `Devuelto en: ${reserva.bukaerako_kargagunea_izena}`));
        main.appendChild(lugar);
      }
    }

    if (reserva.egoera === "amaitua" && reserva.berandu) {
      const extra = crearElemento("div", "reservation-meta mt-1");
      const importe = Number(reserva.karga_extra || 0).toFixed(2).replace(".", ",");
      extra.append(crearMeta("fa-triangle-exclamation", `Cargo extra: ${importe} €`));
      main.appendChild(extra);
    }

    if (estado.label.startsWith("En uso")) {
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
      const qrButton = crearElemento("button", "btn btn-outline-secondary btn-sm");
      const qrIcon = crearElemento("i", "fas fa-qrcode");
      qrButton.append(qrIcon, document.createTextNode("Ver QR"));
      qrButton.type = "button";
      qrButton.addEventListener("click", () => mostrarQR(reserva));
      actions.appendChild(qrButton);
    }

    if (reserva.egoera === "aktiboa" && now < start) {
      const cancel = crearElemento("button", "btn btn-outline-danger btn-sm");
      cancel.append(crearElemento("i", "fas fa-xmark"), document.createTextNode("Cancelar"));
      cancel.type = "button";
      cancel.addEventListener("click", () => cancelarReserva(reserva.id));
      actions.appendChild(cancel);
    } else if (reserva.egoera === "aktiboa") {
      const hint = crearElemento("span", "reservation-hint");
      hint.innerHTML = reserva.egikaritze_data_ordua
        ? '<i class="fas fa-qrcode me-1"></i>Devuélvela escaneando el QR en cualquier taquilla.'
        : '<i class="fas fa-qrcode me-1"></i>Recógela escaneando el QR en la taquilla.';
      actions.appendChild(hint);
    }

    card.append(icon, main, actions);
    lista.appendChild(card);
  });
}

function mostrarQR(reserva) {
  const container = document.getElementById("qrCode");
  const info = document.getElementById("qrInfo");
  const tokenInfo = document.getElementById("qrToken");
  container.replaceChildren();
  qrReservaActual = reserva;
  qrUrlActual = "";
  if (tokenInfo) tokenInfo.textContent = "";

  if (typeof QRCode === "undefined") {
    info.textContent = "No se pudo cargar el generador de QR.";
  } else if (!reserva.qr_token) {
    info.textContent = "Esta reserva no tiene QR. Recarga la página o contacta con soporte.";
  } else {
    qrUrlActual = new URL(
      `locker.html?token=${encodeURIComponent(reserva.qr_token)}`,
      window.location.href,
    ).href;

    new QRCode(container, {
      text: qrUrlActual,
      width: 240,
      height: 240,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });

    info.textContent = `Reserva #${reserva.id} · ${reserva.kargagunea_izena || "Estación"} · ${formatearRango(reserva)}`;
    if (tokenInfo) tokenInfo.textContent = `Código manual: ${reserva.qr_token}`;
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById("qrModal")).show();
}

function qrDataUrl() {
  const container = document.getElementById("qrCode");
  const canvas = container.querySelector("canvas");
  if (canvas) return canvas.toDataURL("image/png");
  return container.querySelector("img")?.src || "";
}

function descargarQR() {
  const dataUrl = qrDataUrl();
  if (!dataUrl) {
    mostrarDialogo("No se pudo preparar el QR para descargar.", {
      title: "Error al descargar",
      type: "error",
    });
    return;
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `powerbank-reserva-${qrReservaActual?.id || "qr"}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function imprimirQR() {
  const dataUrl = qrDataUrl();
  if (!dataUrl) return;

  const info = document.getElementById("qrInfo")?.textContent || "";
  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>QR de reserva</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
          h1 { font-size: 1.4rem; }
          img { width: 340px; max-width: 90vw; }
          p { color: #334155; }
        </style>
      </head>
      <body>
        <h1>Powerbank · QR de reserva</h1>
        <img src="${dataUrl}" alt="QR de la reserva">
        <p>${info}</p>
        <p>Escanea este QR en la taquilla para recoger y devolver la powerbank.</p>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function abrirQrDesdeUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("qr"));
  if (!id) return;

  const reserva = reservas.find((item) => item.id === id && item.egoera === "aktiboa");
  if (!reserva) return;

  mostrarQR(reserva);
  params.delete("qr");
  const query = params.toString();
  history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
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
    await cargarReservas();
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
