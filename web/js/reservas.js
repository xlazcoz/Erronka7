let reservas = [];
let filtroReservas = "all";
let qrReservaActual = null;
let qrUrlActual = "";
let reservaParaModificar = null;

document.addEventListener("DOMContentLoaded", () => {
  cargarReservas();
  document.getElementById("btnRefrescarReservas").addEventListener("click", refrescarReservas);
  document.getElementById("qrDownload")?.addEventListener("click", descargarQR);
  document.getElementById("qrPrint")?.addEventListener("click", imprimirQR);
  document.getElementById("modifyForm")?.addEventListener("submit", guardarModificacion);

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
    await mostrarDialogo(`Ezin izan dira erreserbak kargatu: ${error.message}`, {
      title: "Errorea kargatzean",
      type: "error",
    });
  }
}

function estadoReserva(reserva) {
  if (reserva.egoera === "ezeztatua") {
    return { key: "cancelled", label: "Ezeztatuta", badge: "pb-badge-muted" };
  }

  const now = new Date();
  const start = new Date(reserva.hasiera_data_ordua);
  const end = new Date(reserva.amaiera_data_ordua);

  if (reserva.egoera === "amaitua") {
    if (!reserva.egikaritze_data_ordua) {
      return { key: "finished", label: "Iraungita · jaso gabe", badge: "pb-badge-muted" };
    }
    if (reserva.berandu) {
      return { key: "finished", label: "Berandu itzulita", badge: "pb-badge-warning" };
    }
    return { key: "finished", label: "Amaituta", badge: "pb-badge-success" };
  }

  if (reserva.egikaritze_data_ordua) {
    if (now > end) {
      return { key: "active", label: "Erabiltzen · itzultzeko dago", badge: "pb-badge-danger" };
    }
    return { key: "active", label: "Erabiltzen", badge: "pb-badge-warning" };
  }

  if (now < start) {
    return { key: "active", label: "Aktiboa", badge: "pb-badge-primary" };
  }
  if (now <= end) {
    return { key: "active", label: "Jasotzeko prest", badge: "pb-badge-warning" };
  }

  return { key: "finished", label: "Iraungita · jaso gabe", badge: "pb-badge-muted" };
}

function formatearFechaHora(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("eu", {
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
    return `${start.toLocaleDateString("eu", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} · ${start.toLocaleTimeString("eu", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(
      "eu",
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
  return rest === 0 ? `${hours} ordu` : `${hours} ordu ${rest} min`;
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

function renderizarProxima(reserva) {
  const contenedor = document.getElementById("reservaProxima");
  if (!contenedor) return;
  contenedor.replaceChildren();
  if (!reserva) return;

  const estado = estadoReserva(reserva);
  const card = crearElemento("article", "reservation-next-card");

  const head = crearElemento("div", "reservation-next-head");
  head.append(
    crearElemento("span", "pb-eyebrow", "Hurrengo erreserba"),
    crearElemento("span", `pb-badge ${estado.badge}`, estado.label),
  );

  const titulo = crearElemento(
    "h2",
    "reservation-next-title",
    reserva.kargagunea_izena || "Kargagunea",
  );

  const meta = crearElemento("div", "reservation-next-meta");
  meta.append(
    crearMeta("fa-calendar-days", formatearRango(reserva)),
    crearMeta(
      "fa-plug",
      (reserva.karga_postua_izena || "Postua").replace(/^Puesto\b/, "Postua"),
    ),
    crearMeta("fa-battery-full", `Powerbank #${reserva.powerbank_id}`),
    crearMeta("fa-clock", formatearDuracion(reserva)),
  );

  const actions = crearElemento("div", "reservation-next-actions");

  if (reserva.egoera === "aktiboa") {
    const qr = crearElemento("button", "btn btn-qr btn-sm");
    qr.type = "button";
    qr.innerHTML = '<i class="fas fa-qrcode me-1"></i>Ikusi QR';
    qr.addEventListener("click", () => mostrarQR(reserva));
    actions.appendChild(qr);
  }

  if (!reserva.egikaritze_data_ordua) {
    const cancelar = crearElemento("button", "btn btn-outline-danger btn-sm");
    cancelar.type = "button";
    cancelar.innerHTML = '<i class="fas fa-xmark me-1"></i>Ezeztatu';
    cancelar.addEventListener("click", () => cancelarReserva(reserva.id));
    actions.appendChild(cancelar);

    const modificar = crearElemento("button", "btn btn-outline-primary btn-sm");
    modificar.type = "button";
    modificar.innerHTML = '<i class="fas fa-pen me-1"></i>Aldatu';
    modificar.addEventListener("click", () => abrirModificar(reserva));
    actions.appendChild(modificar);
  } else {
    const hint = crearElemento("span", "reservation-hint");
    hint.innerHTML =
      '<i class="fas fa-qrcode me-1"></i>Itzuli ezazu QR kodea edozein taquillatan eskaneatuz.';
    actions.appendChild(hint);
  }

  card.append(head, titulo, meta, actions);
  contenedor.appendChild(card);
}

function toDateInputValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toTimeInputValue(date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
}

function combineDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const value = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function toLocalIsoString(date) {
  return [
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`,
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(
      2,
      "0",
    )}:00`,
  ].join("T");
}

function setLoadingBoton(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.querySelector(".pb-spinner")?.classList.toggle("d-none", !loading);
}

function mostrarFeedbackModificar(message, type = "error") {
  const element = document.getElementById("modifyFeedback");
  if (!element) return;
  element.textContent = message;
  element.className = `pb-feedback is-visible pb-feedback-${type} mb-3`;
}

function abrirModificar(reserva) {
  reservaParaModificar = reserva;
  const start = new Date(reserva.hasiera_data_ordua);
  const end = new Date(reserva.amaiera_data_ordua);

  document.getElementById("modifyStartDate").value = toDateInputValue(start);
  document.getElementById("modifyStartTime").value = toTimeInputValue(start);
  document.getElementById("modifyEndDate").value = toDateInputValue(end);
  document.getElementById("modifyEndTime").value = toTimeInputValue(end);

  const hoy = toDateInputValue(new Date());
  for (const id of ["modifyStartDate", "modifyEndDate"]) {
    const input = document.getElementById(id);
    input.min = hoy;
    input.max = hoy;
  }

  const feedback = document.getElementById("modifyFeedback");
  feedback.textContent = "";
  feedback.className = "pb-feedback mb-3";

  bootstrap.Modal.getOrCreateInstance(document.getElementById("modifyModal")).show();
}

function validarHorario(start, end) {
  const now = new Date();
  if (toDateInputValue(start) !== toDateInputValue(now)) {
    return "Gaurko erreserbatu dezakezu soilik.";
  }
  if (start < new Date(now.getTime() - 60 * 1000)) {
    return "Jasotzeko ordua ezin da iraganekoa izan.";
  }
  if (start > new Date(now.getTime() + 6 * 60 * 60 * 1000)) {
    return "Gehienez 6 ordu lehenago erreserbatu dezakezu.";
  }
  if (end <= start) {
    return "Itzultzeko ordua jasotzekoa baino beranduagoa izan behar da.";
  }

  const duration = end - start;
  if (duration < 15 * 60 * 1000) {
    return "Erreserbak gutxienez 15 minutu iraun behar du.";
  }
  if (duration > 6 * 60 * 60 * 1000) {
    return "Erreserbak ezin du 6 ordu baino gehiago iraun.";
  }
  return null;
}

async function guardarModificacion(event) {
  event.preventDefault();
  if (!reservaParaModificar) return;

  const start = combineDateTime(
    document.getElementById("modifyStartDate").value,
    document.getElementById("modifyStartTime").value,
  );
  const end = combineDateTime(
    document.getElementById("modifyEndDate").value,
    document.getElementById("modifyEndTime").value,
  );

  if (!start || !end) {
    mostrarFeedbackModificar("Aukeratu jasotzeko eta itzultzeko data eta ordua.");
    return;
  }

  const error = validarHorario(start, end);
  if (error) {
    mostrarFeedbackModificar(error);
    return;
  }

  const button = document.getElementById("modifySubmit");
  setLoadingBoton(button, true);

  try {
    await apiRequest(`/erreserbak/${reservaParaModificar.id}/ordutegia`, {
      method: "PATCH",
      body: {
        hasiera_data_ordua: toLocalIsoString(start),
        amaiera_data_ordua: toLocalIsoString(end),
      },
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById("modifyModal")).hide();
    await cargarReservas();
    await mostrarDialogo("Erreserba behar bezala aldatu da.", {
      title: "Erreserba aldatuta",
      type: "success",
    });
  } catch (err) {
    mostrarFeedbackModificar(`Ezin izan da erreserba aldatu: ${err.message}`);
  } finally {
    setLoadingBoton(button, false);
  }
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

  const proxima =
    reservas
      .filter((reserva) => reserva.egoera === "aktiboa")
      .sort((a, b) => new Date(a.hasiera_data_ordua) - new Date(b.hasiera_data_ordua))[0] ||
    null;

  renderizarProxima(proxima);

  const filtradas = reservas
    .filter((reserva) => !proxima || reserva.id !== proxima.id)
    .filter((reserva) => filtroReservas === "all" || estadoReserva(reserva).key === filtroReservas)
    .sort((a, b) => new Date(b.hasiera_data_ordua) - new Date(a.hasiera_data_ordua));

  if (filtradas.length === 0) {
    const empty = crearElemento("div", "pb-empty");
    const icon = crearElemento("i", "fas fa-calendar-days");
    let mensaje = "Ez dago erreserbarik iragazki honekin.";
    if (reservas.length === 0) {
      mensaje = "Oraindik ez duzu erreserbarik. Bilatu kargagune bat eta erreserbatu zure powerbank.";
    } else if (proxima) {
      mensaje = "Ez dago beste erreserbarik.";
    }
    const text = crearElemento("p", reservas.length === 0 ? "mb-3" : "mb-0", mensaje);
    empty.append(icon, text);
    if (reservas.length === 0) {
      const link = crearElemento("a", "btn btn-outline-primary btn-sm", "Bilatu kargagunea");
      link.href = "Kargaguneak.html";
      empty.appendChild(link);
    }
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
      crearElemento("span", "", reserva.kargagunea_izena || `Kargagunea #${reserva.kargagunea_id || "—"}`),
      badge,
    );

    const meta = crearElemento("div", "reservation-meta");
    meta.append(
      crearMeta("fa-hashtag", `Erreserba #${reserva.id}`),
      crearMeta(
        "fa-plug",
        (reserva.karga_postua_izena || `Postua #${reserva.hasierako_karga_postua}`).replace(
          /^Puesto\b/,
          "Postua",
        ),
      ),
      crearMeta("fa-battery-full", `Powerbank #${reserva.powerbank_id}`),
      crearMeta("fa-clock", `Iraupena: ${formatearDuracion(reserva)}`),
    );

    const fecha = crearElemento("div", "reservation-meta mt-1");
    fecha.append(crearMeta("fa-calendar-days", formatearRango(reserva)));

    main.append(title, meta, fecha);

    if (reserva.egikaritze_data_ordua) {
      const recogido = crearElemento("div", "reservation-meta mt-1");
      recogido.append(crearMeta("fa-hand-holding", `Jasota: ${formatearFechaHora(reserva.egikaritze_data_ordua)}`));
      main.appendChild(recogido);
    }

    if (reserva.egoera === "amaitua" && reserva.amaitze_data_ordua && reserva.egikaritze_data_ordua) {
      const devuelto = crearElemento("div", "reservation-meta mt-1");
      devuelto.append(crearMeta("fa-circle-check", `Itzulita: ${formatearFechaHora(reserva.amaitze_data_ordua)}`));
      main.appendChild(devuelto);

      if (reserva.bukaerako_kargagunea_izena) {
        const lugar = crearElemento("div", "reservation-meta mt-1");
        lugar.append(crearMeta("fa-location-dot", `Itzulia hemen: ${reserva.bukaerako_kargagunea_izena}`));
        main.appendChild(lugar);
      }
    }

    if (reserva.egoera === "amaitua" && reserva.berandu) {
      const extra = crearElemento("div", "reservation-meta mt-1");
      const importe = Number(reserva.karga_extra || 0).toFixed(2).replace(".", ",");
      extra.append(crearMeta("fa-triangle-exclamation", `Gastu gehigarria: ${importe} €`));
      main.appendChild(extra);
    }

    if (estado.label.startsWith("Erabiltzen")) {
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
    const jasoGabe = !reserva.egikaritze_data_ordua;
    const ezeztagarria = jasoGabe && ["aktiboa", "amaitua"].includes(reserva.egoera);

    if (reserva.egoera === "aktiboa") {
      const qrButton = crearElemento("button", "btn btn-outline-secondary btn-sm");
      const qrIcon = crearElemento("i", "fas fa-qrcode");
      qrButton.append(qrIcon, document.createTextNode("Ikusi QR"));
      qrButton.type = "button";
      qrButton.addEventListener("click", () => mostrarQR(reserva));
      actions.appendChild(qrButton);
    }

    // Powerbanka jaso ez bada, hasiera-ordua igaro ondoren ere ezeztatu daiteke.
    if (ezeztagarria) {
      const cancel = crearElemento("button", "btn btn-outline-danger btn-sm");
      cancel.append(crearElemento("i", "fas fa-xmark"), document.createTextNode("Ezeztatu"));
      cancel.type = "button";
      cancel.addEventListener("click", () => cancelarReserva(reserva.id));
      actions.appendChild(cancel);
    }

    if (reserva.egoera === "aktiboa") {
      const hint = crearElemento("span", "reservation-hint");
      hint.innerHTML = reserva.egikaritze_data_ordua
        ? '<i class="fas fa-qrcode me-1"></i>Itzuli ezazu QR kodea edozein taquillatan eskaneatuz.'
        : '<i class="fas fa-qrcode me-1"></i>Jaso ezazu QR kodea taquillan eskaneatuz.';
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
  document.getElementById("qrSuccess")?.classList.add("d-none");
  container.replaceChildren();
  qrReservaActual = reserva;
  qrUrlActual = "";
  if (tokenInfo) tokenInfo.textContent = "";

  if (typeof QRCode === "undefined") {
    info.textContent = "Ezin izan da QR sortzailea kargatu.";
  } else if (!reserva.qr_token) {
    info.textContent = "Erreserba honek ez du QRrik. Kargatu orria berriro edo jarri harremanetan laguntzarekin.";
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

    info.textContent = `Erreserba #${reserva.id} · ${reserva.kargagunea_izena || "Kargagunea"} · ${formatearRango(reserva)}`;
    if (tokenInfo) tokenInfo.textContent = `Eskuzko kodea: ${reserva.qr_token}`;
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
    mostrarDialogo("Ezin izan da QR kodea deskargatzeko prestatu.", {
      title: "Errorea deskargatzean",
      type: "error",
    });
    return;
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `powerbank-erreserba-${qrReservaActual?.id || "qr"}.png`;
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
    <html lang="eu">
      <head>
        <meta charset="utf-8">
        <title>Erreserbaren QR kodea</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
          h1 { font-size: 1.4rem; }
          img { width: 340px; max-width: 90vw; }
          p { color: #334155; }
        </style>
      </head>
      <body>
        <h1>Powerbank · Erreserbaren QR kodea</h1>
        <img src="${dataUrl}" alt="Erreserbaren QR kodea">
        <p>${info}</p>
        <p>Eskaneatu QR hau taquillan powerbanka jaso eta itzultzeko.</p>
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
  document.getElementById("qrSuccess")?.classList.remove("d-none");
  params.delete("qr");
  const query = params.toString();
  history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

async function cancelarReserva(reservaId) {
  const confirmado = await confirmarDialogo("Erreserba hau ezeztatu nahi duzu?", {
    title: "Ezeztatu erreserba",
  });
  if (!confirmado) return;

  try {
    await apiRequest(`/erreserbak/${reservaId}/egoera`, {
      method: "PATCH",
      body: { egoera: "ezeztatua" },
    });
    await cargarReservas();
    await mostrarDialogo("Erreserba ezeztatu da.", {
      title: "Erreserba ezeztatuta",
      type: "success",
    });
  } catch (error) {
    await mostrarDialogo(`Ezin izan da erreserba ezeztatu: ${error.message}`, {
      title: "Errorea ezeztatzean",
      type: "error",
    });
  }
}
