const LOCKER_STATION_KEY = "powerbank_locker_station";

let lockerUser = null;
let lockerStations = [];
let qrScanner = null;
let scannerRunning = false;
let processingToken = false;
let pendingToken = null;

const STATUS_META = {
  idle: { icon: "fa-qrcode", title: "QR baten zain…", kind: "idle" },
  loading: { icon: "fa-spinner fa-spin", title: "QR kodea balidatzen…", kind: "idle" },
  in_use: { icon: "fa-lock-open", title: "Erreserba erabiltzen", kind: "success" },
  closed: { icon: "fa-lock", title: "Taquilla itxita", kind: "success" },
  returned: { icon: "fa-circle-check", title: "Powerbank emanda", kind: "success" },
  returned_late: {
    icon: "fa-triangle-exclamation",
    title: "Berandu emanda",
    kind: "warning",
  },
  too_early: { icon: "fa-clock", title: "Oraindik ez da ordua", kind: "warning" },
  expired: { icon: "fa-hourglass-end", title: "QR iraungita", kind: "danger" },
  wrong_station: {
    icon: "fa-location-crosshairs",
    title: "Kargagune okerra",
    kind: "danger",
  },
  no_free_locker: { icon: "fa-box-open", title: "Taquilla librerik ez", kind: "danger" },
  already_returned: { icon: "fa-circle-info", title: "Dagoeneko itzulita", kind: "info" },
  cancelled: { icon: "fa-ban", title: "Erreserba ezeztatuta", kind: "danger" },
  invalid: { icon: "fa-qrcode", title: "QR baliogabea", kind: "danger" },
  invalid_station: { icon: "fa-location-xmark", title: "Kargagune baliogabea", kind: "danger" },
  error: { icon: "fa-triangle-exclamation", title: "Error", kind: "danger" },
};

document.addEventListener("DOMContentLoaded", iniciarTaquilla);

async function iniciarTaquilla() {
  document.getElementById("btnLogout").addEventListener("click", cerrarSesion);
  document.getElementById("lockerSaveStation").addEventListener("click", guardarEstacion);
  document.getElementById("lockerChangeStation").addEventListener("click", cambiarEstacion);
  document.getElementById("lockerScanButton").addEventListener("click", iniciarEscaner);
  document.getElementById("lockerStopButton").addEventListener("click", detenerEscaner);
  document.getElementById("lockerTokenSubmit").addEventListener("click", validarTokenManual);
  document.getElementById("lockerTokenInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") validarTokenManual();
  });

  pendingToken = new URLSearchParams(window.location.search).get("token");

  try {
    lockerUser = await apiRequest("/login/me");
  } catch (error) {
    if (error.status === 401) {
      const next = `locker.html${window.location.search || ""}`;
      window.location.href = `Login.html?next=${encodeURIComponent(next)}`;
      return;
    }

    mostrarSeccion("lockerUnauthorized");
    return;
  }

  if (lockerUser.rola !== "admin") {
    mostrarSeccion("lockerUnauthorized");
    return;
  }

  try {
    await cargarEstaciones();
  } catch (error) {
    mostrarResultado({
      status: "error",
      message: `Ezin izan dira kargaguneak kargatu: ${error.message}`,
    });
    mostrarSeccion("lockerPanel");
    return;
  }

  const savedStationId = Number(localStorage.getItem(LOCKER_STATION_KEY));
  const savedStation = lockerStations.find((station) => station.id === savedStationId);

  if (savedStation) {
    abrirPanel(savedStation);
  } else {
    document.getElementById("lockerStationSelect").value = "";
    mostrarSeccion("lockerSetup");
  }
}

function mostrarSeccion(id) {
  ["lockerLoading", "lockerUnauthorized", "lockerSetup", "lockerPanel"].forEach((sectionId) => {
    document.getElementById(sectionId).classList.toggle("d-none", sectionId !== id);
  });
}

async function cargarEstaciones() {
  lockerStations = await apiRequest("/kargaguneak");
  const select = document.getElementById("lockerStationSelect");
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Aukeratu kargagunea";
  select.appendChild(placeholder);

  lockerStations.forEach((station) => {
    const option = document.createElement("option");
    option.value = String(station.id);
    option.textContent = [station.izena, station.udalerria_izena].filter(Boolean).join(" · ");
    select.appendChild(option);
  });
}

function guardarEstacion() {
  const select = document.getElementById("lockerStationSelect");
  const stationId = Number(select.value);
  if (!stationId) {
    select.classList.add("is-invalid");
    return;
  }
  select.classList.remove("is-invalid");

  const station = lockerStations.find((item) => item.id === stationId);
  if (!station) return;

  localStorage.setItem(LOCKER_STATION_KEY, String(stationId));
  abrirPanel(station);
}

function abrirPanel(station) {
  document.getElementById("lockerStationName").textContent = station.izena;
  document.getElementById("lockerStationAddress").textContent = [
    station.udalerria_izena,
    station.helbidea,
  ]
    .filter(Boolean)
    .join(" · ");

  mostrarSeccion("lockerPanel");

  if (pendingToken) {
    const token = pendingToken;
    pendingToken = null;
    procesarToken(token);
  }
}

function cambiarEstacion() {
  detenerEscaner();
  localStorage.removeItem(LOCKER_STATION_KEY);
  document.getElementById("lockerStationSelect").value = "";
  mostrarSeccion("lockerSetup");
}

function validarTokenManual() {
  const input = document.getElementById("lockerTokenInput");
  const token = extraerToken(input.value.trim());
  if (!token) {
    mostrarResultado({
      status: "invalid",
      message: "Itsatsi token baliozkoa edo QRren URLa.",
    });
    return;
  }
  input.value = "";
  procesarToken(token);
}

function extraerToken(texto) {
  if (!texto) return "";
  try {
    const url = new URL(texto);
    return url.searchParams.get("token") || "";
  } catch {
    const match = texto.match(/[a-f0-9]{32}/i);
    return match ? match[0] : "";
  }
}

async function procesarToken(token) {
  if (processingToken) return;
  const stationId = Number(localStorage.getItem(LOCKER_STATION_KEY));
  if (!stationId) {
    pendingToken = token;
    mostrarSeccion("lockerSetup");
    return;
  }

  processingToken = true;
  mostrarResultado({ status: "loading", message: "Erreserba egiaztatzen…" });

  try {
    const data = await apiRequest("/qr/eskaneatu", {
      method: "POST",
      body: { token, kargagunea_id: stationId },
    });
    mostrarResultado(data);
  } catch (error) {
    const payload =
      error.data && !error.data.status
        ? {
            status: "error",
            message: error.data.detail || error.data.message || error.message,
          }
        : error.data || {
            status: "error",
            message: error.message || "Ezin izan da QR kodea balidatu.",
          };
    mostrarResultado(payload);
  } finally {
    processingToken = false;
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }
}

function mostrarResultado(data) {
  const meta = STATUS_META[data?.status] || STATUS_META.error;
  const result = document.getElementById("lockerResult");
  result.replaceChildren();
  result.className = `locker-result locker-result-${meta.kind}`;

  const icon = document.createElement("i");
  icon.className = `fas ${meta.icon} locker-result-icon`;

  const title = document.createElement("h3");
  title.className = "h5 fw-bold";
  title.textContent = meta.title;

  const message = document.createElement("p");
  message.className = "mb-3";
  message.textContent = data?.message || "";

  result.append(icon, title, message);

  if (data?.station?.izena) {
    result.appendChild(crearDetalle("Kargagunea", data.station.izena));
  }

  if (data?.locker_id) {
    result.appendChild(crearDetalle("Taquilla", `#${data.locker_id}`));
  }

  if (data?.powerbank_id) {
    result.appendChild(crearDetalle("Powerbank", `#${data.powerbank_id}`));
  }

  if (data?.reservation) {
    const reserva = data.reservation;

    if (reserva.kargagunea_izena) {
      result.appendChild(crearDetalle("Erreserba hemen", reserva.kargagunea_izena));
    }
    if (reserva.hasiera_data_ordua) {
      result.appendChild(crearDetalle("Ordutegia", formatearRango(reserva)));
    }
    if (reserva.berandu && data?.status !== "returned_late") {
      const importe = Number(reserva.karga_extra || 0)
        .toFixed(2)
        .replace(".", ",");
      result.appendChild(crearDetalle("Gastu gehigarria", `${importe} €`));
    }
  }

  if (data?.status === "returned_late" && data.extra_fee != null) {
    const importe = Number(data.extra_fee).toFixed(2).replace(".", ",");
    result.appendChild(
      crearDetalle("Gastu gehigarria", `${importe} € (${data.late_hours} hasitako ordu)`)
    );
  }

  if (data?.status === "in_use") {
    result.appendChild(
      crearBoton("Itxi taquilla", "btn btn-primary w-100 mt-2", () => {
        mostrarResultado({
          status: "closed",
          message: "Taquilla itxita. Erreserba erabiltzen geratzen da itzuli arte.",
        });
      })
    );
  }

  if (["returned", "returned_late"].includes(data?.status)) {
    const importe = Number(data.extra_fee || 0)
      .toFixed(2)
      .replace(".", ",");
    const mensaje = data.late
      ? `Taquilla itxita. Powerbank berandu emanda. Gastu gehigarria: ${importe} €.`
      : "Taquilla itxita. Powerbank behar bezala emanda.";

    result.appendChild(
      crearBoton("Itxi taquilla", "btn btn-primary w-100 mt-2", () => {
        mostrarResultado({ status: "closed", message: mensaje });
      })
    );
  }

  if (data?.status && !["loading", "idle"].includes(data.status)) {
    result.appendChild(
      crearBoton("Eskaneatu beste QR bat", "btn btn-outline-primary w-100 mt-2", () => {
        mostrarResultado({ status: "idle" });
        document.getElementById("lockerScanButton").focus();
      })
    );
  }
}

function crearDetalle(label, value) {
  const row = document.createElement("div");
  row.className = "locker-detail";

  const labelElement = document.createElement("span");
  labelElement.className = "locker-detail-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.className = "locker-detail-value";
  valueElement.textContent = value;

  row.append(labelElement, valueElement);
  return row;
}

function crearBoton(texto, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = texto;
  button.addEventListener("click", onClick);
  return button;
}

function formatearRango(reserva) {
  const start = new Date(reserva.hasiera_data_ordua);
  const end = new Date(reserva.amaiera_data_ordua);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const date = start.toLocaleDateString("eu", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString("eu", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("eu", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${startTime} – ${endTime}`;
}

async function iniciarEscaner() {
  if (scannerRunning) return;

  if (!window.Html5Qrcode) {
    mostrarResultado({
      status: "error",
      message:
        "Ezin izan da irakurgailua kargatu. Erabili mugikorraren kamera edo itsatsi QR kodea.",
    });
    return;
  }

  if (!window.isSecureContext) {
    mostrarResultado({
      status: "error",
      message:
        "Kamera integratuak HTTPS behar du. Lokalean erabili mugikorraren kamera edo itsatsi QR kodea.",
    });
    return;
  }

  if (!qrScanner) {
    qrScanner = new Html5Qrcode("qrReader");
  }

  const scanButton = document.getElementById("lockerScanButton");
  const stopButton = document.getElementById("lockerStopButton");
  const badge = document.getElementById("lockerStatusBadge");

  scanButton.disabled = true;
  badge.textContent = "Hasten…";

  try {
    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        const token = extraerToken(decodedText);
        if (!token || processingToken) return;
        detenerEscaner().then(() => procesarToken(token));
      }
    );
    scannerRunning = true;
    scanButton.classList.add("d-none");
    stopButton.classList.remove("d-none");
    badge.textContent = "Kamera aktibo";
    badge.className = "pb-badge pb-badge-success";
  } catch {
    scanButton.disabled = false;
    badge.textContent = "Prest";
    badge.className = "pb-badge pb-badge-primary";
    try {
      qrScanner?.clear();
    } catch {
      // Ignorar.
    }
    qrScanner = null;
    mostrarResultado({
      status: "error",
      message: "Ezin izan da kamera ireki. Erabili mugikorraren kamera edo itsatsi QR kodea.",
    });
  }
}

async function detenerEscaner() {
  const scanButton = document.getElementById("lockerScanButton");
  const stopButton = document.getElementById("lockerStopButton");
  const badge = document.getElementById("lockerStatusBadge");

  if (qrScanner && scannerRunning) {
    try {
      await qrScanner.stop();
      qrScanner.clear();
    } catch {
      // La cámara ya estaba parada.
    }
  }

  qrScanner = null;
  scannerRunning = false;
  scanButton.disabled = false;
  scanButton.classList.remove("d-none");
  stopButton.classList.add("d-none");
  badge.textContent = "Prest";
  badge.className = "pb-badge pb-badge-primary";
}

async function cerrarSesion() {
  try {
    await apiRequest("/login/logout", { method: "POST" });
  } catch {
    // Aunque falle, volvemos al login.
  }
  window.location.href = "Login.html";
}
