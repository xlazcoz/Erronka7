const lista = document.getElementById("lista");
const stationsCount = document.getElementById("stationsCount");
const municipalityFilter = document.getElementById("municipalityFilter");
const mapEmpty = document.getElementById("mapEmpty");
const stationSearch = document.getElementById("stationSearch");
const onlyAvailable = document.getElementById("onlyAvailable");
const stationSort = document.getElementById("stationSort");
const btnRefresh = document.getElementById("btnRefresh");

let todasLasEstaciones = [];
let municipios = [];
let mapa = null;
let capaMarcadores = null;
let soloDisponibles = false;

document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  configurarInteracciones();
  configurarReveal();
  Datuak();
});

function configurarInteracciones() {
  municipalityFilter.addEventListener("change", () => aplicarFiltro());
  stationSort.addEventListener("change", () => aplicarFiltro());

  stationSearch.addEventListener("input", () => aplicarFiltro({ animar: false }));

  onlyAvailable.addEventListener("click", () => {
    soloDisponibles = !soloDisponibles;
    onlyAvailable.setAttribute("aria-pressed", String(soloDisponibles));
    aplicarFiltro();
  });

  btnRefresh.addEventListener("click", () => Datuak());
}

async function Datuak() {
  btnRefresh.classList.add("is-loading");

  try {
    todasLasEstaciones = await apiRequest("/kargaguneak");

    try {
      municipios = await apiRequest("/udalerriak");
    } catch (error) {
      console.warn("No se pudieron cargar los municipios:", error);
      municipios = [];
    }

    renderizarMunicipios();
    actualizarEstadisticas();
    aplicarFiltro();
  } catch (error) {
    console.error("No se pudieron cargar las estaciones:", error);
    lista.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "pb-empty";
    empty.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
    const message = document.createElement("p");
    message.className = "mb-0";
    message.textContent = `No se pudieron cargar las estaciones: ${error.message}`;
    empty.appendChild(message);
    lista.appendChild(empty);
    stationsCount.textContent = "Error de conexión";
  } finally {
    btnRefresh.classList.remove("is-loading");
  }
}

function crearElemento(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderizarMunicipios() {
  municipalityFilter.replaceChildren();

  const allOption = crearElemento("option", "", "Todos los municipios");
  allOption.value = "";
  municipalityFilter.appendChild(allOption);

  municipios
    .filter((municipio) => municipio.aktiboa !== false)
    .forEach((municipio) => {
      const option = crearElemento("option", "", municipio.izena);
      option.value = String(municipio.id);
      municipalityFilter.appendChild(option);
    });
}

function estadoEstacion(poste) {
  const operativa = (poste.egoera || "").toLowerCase() === "erabilgarri";
  const libres = operativa ? poste.libres || 0 : 0;
  const total = (poste.karga_postuak || []).length;
  const porcentaje = total > 0 ? Math.min(100, Math.round((libres / total) * 100)) : 0;

  let etiqueta = "Disponible";
  let badge = "pb-badge-success";
  let detalle = `${libres} powerbank(s) listas para usar`;
  let cardClass = "is-available";
  let markerClass = "is-available";

  if (!operativa) {
    const cerrada = (poste.egoera || "").toLowerCase() === "mantentze-lanetan";
    etiqueta = cerrada ? "Mantenimiento" : "Cerrada";
    badge = "pb-badge-muted";
    detalle = cerrada ? "En mantenimiento" : "Fuera de servicio";
    cardClass = "is-closed";
    markerClass = "is-closed";
  } else if (libres === 0) {
    etiqueta = "Sin stock";
    badge = "pb-badge-danger";
    detalle = "Sin powerbanks disponibles ahora";
    cardClass = "is-empty";
    markerClass = "is-empty";
  }

  return { operativa, libres, total, porcentaje, etiqueta, badge, detalle, cardClass, markerClass };
}

function estacionesFiltradas() {
  const municipalityId = municipalityFilter.value;
  const consulta = (stationSearch.value || "").trim().toLowerCase();

  let resultado = todasLasEstaciones.filter((poste) => {
    if (municipalityId && String(poste.udalerria_id) !== municipalityId) return false;

    if (consulta) {
      const texto = [poste.izena, poste.helbidea, poste.udalerria_izena]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!texto.includes(consulta)) return false;
    }

    if (soloDisponibles) {
      const estado = estadoEstacion(poste);
      if (!estado.operativa || estado.libres === 0) return false;
    }

    return true;
  });

  const orden = stationSort.value;
  resultado = [...resultado].sort((a, b) => {
    const estadoA = estadoEstacion(a);
    const estadoB = estadoEstacion(b);

    if (orden === "nombre") {
      return (a.izena || "").localeCompare(b.izena || "", "es");
    }

    if (orden === "disponibilidad") {
      return estadoB.libres - estadoA.libres;
    }

    const prioridadA = estadoA.operativa && estadoA.libres > 0 ? 0 : 1;
    const prioridadB = estadoB.operativa && estadoB.libres > 0 ? 0 : 1;
    if (prioridadA !== prioridadB) return prioridadA - prioridadB;
    return estadoB.libres - estadoA.libres;
  });

  return resultado;
}

function filtrosActivos() {
  return Boolean(municipalityFilter.value || stationSearch.value.trim() || soloDisponibles);
}

function aplicarFiltro({ animar = true } = {}) {
  const filtradas = estacionesFiltradas();
  renderizarLista(filtradas, animar);
  renderizarMapa(filtradas);
}

function limpiarFiltros() {
  municipalityFilter.value = "";
  stationSearch.value = "";
  stationSort.value = "recomendado";
  soloDisponibles = false;
  onlyAvailable.setAttribute("aria-pressed", "false");
  aplicarFiltro({ animar: false });
}

function renderizarLista(elementos, animar) {
  lista.replaceChildren();

  if (filtrosActivos()) {
    stationsCount.textContent = `${elementos.length} de ${todasLasEstaciones.length} estación(es) coinciden con tu búsqueda`;
  } else {
    stationsCount.textContent = `${elementos.length} estación(es) en la red`;
  }

  if (!elementos.length) {
    const empty = crearElemento("div", "pb-empty");
    empty.innerHTML = '<i class="fas fa-location-dot"></i>';

    const texto = crearElemento(
      "p",
      filtrosActivos() ? "mb-3" : "mb-0",
      filtrosActivos()
        ? "Ninguna estación coincide con los filtros seleccionados."
        : "No hay estaciones para este filtro.",
    );
    empty.appendChild(texto);

    if (filtrosActivos()) {
      const reset = crearElemento("button", "btn btn-outline-primary btn-sm", "Quitar filtros");
      reset.type = "button";
      reset.addEventListener("click", limpiarFiltros);
      empty.appendChild(reset);
    }

    lista.appendChild(empty);
    return;
  }

  elementos.forEach((poste, indice) => {
    const estado = estadoEstacion(poste);

    const a = crearElemento("a", `estacion-item ${estado.cardClass}${animar ? " animate-in" : ""}`);
    a.href = `puesto-Carga.html?id=${poste.id}`;
    a.style.setProperty("--i", String(indice));
    a.setAttribute("aria-label", `Ver estación ${poste.izena}`);

    const lead = crearElemento("div", "station-lead");
    const icon = crearElemento("div", "station-icon");
    icon.innerHTML = '<i class="fas fa-bolt" aria-hidden="true"></i>';

    const info = crearElemento("div", "station-info");
    const titleRow = crearElemento("div", "station-title-row");
    const badge = crearElemento("span", `pb-badge ${estado.badge}`);
    const dot = crearElemento("span", "status-dot");
    badge.append(dot, document.createTextNode(estado.etiqueta));
    titleRow.append(crearElemento("h3", "station-name", poste.izena), badge);

    const direccion = crearElemento("p", "station-address");
    const iconoDireccion = crearElemento("i", "fas fa-location-dot");
    iconoDireccion.setAttribute("aria-hidden", "true");
    direccion.append(
      iconoDireccion,
      document.createTextNode(
        [poste.udalerria_izena, poste.helbidea].filter(Boolean).join(" · ") || "Sin dirección",
      ),
    );
    info.append(titleRow, direccion);
    lead.append(icon, info);

    const disponibilidad = crearElemento("div", "station-availability");
    const cabecera = crearElemento("div", "station-availability-head");
    cabecera.append(
      crearElemento("strong", "station-availability-count", String(estado.libres)),
      crearElemento(
        "span",
        "station-availability-label",
        estado.total > 0 ? `de ${estado.total} puntos` : "sin puntos",
      ),
    );
    const meter = crearElemento("div", "station-meter");
    const fill = crearElemento("span");
    fill.style.setProperty("--fill", `${estado.porcentaje}%`);
    meter.appendChild(fill);
    disponibilidad.append(cabecera, meter);

    const cta = crearElemento("span", "station-cta");
    cta.innerHTML = 'Reservar <i class="fas fa-arrow-right" aria-hidden="true"></i>';

    a.append(lead, disponibilidad, cta);
    lista.appendChild(a);
  });
}

function animarContador(elemento, valor, sufijo = "") {
  if (!elemento) return;

  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducido) {
    elemento.textContent = `${valor}${sufijo}`;
    elemento.dataset.valor = String(valor);
    return;
  }

  const desde = Number(elemento.dataset.valor || 0);
  if (desde === valor) {
    elemento.textContent = `${valor}${sufijo}`;
    return;
  }

  const inicio = performance.now();
  const duracion = 900;

  const paso = (ahora) => {
    const progreso = Math.min(1, (ahora - inicio) / duracion);
    const suave = 1 - Math.pow(1 - progreso, 3);
    elemento.textContent = `${Math.round(desde + (valor - desde) * suave)}${sufijo}`;
    if (progreso < 1) {
      requestAnimationFrame(paso);
    } else {
      elemento.dataset.valor = String(valor);
    }
  };

  requestAnimationFrame(paso);
}

function actualizarEstadisticas() {
  const total = todasLasEstaciones.length;
  const libres = todasLasEstaciones.reduce((suma, poste) => {
    const operativa = (poste.egoera || "").toLowerCase() === "erabilgarri";
    return suma + (operativa ? poste.libres || 0 : 0);
  }, 0);

  const municipiosActivos = municipios.filter((municipio) => municipio.aktiboa !== false).length;
  const municipiosDistintos = new Set(
    todasLasEstaciones.map((poste) => poste.udalerria_izena).filter(Boolean),
  ).size;
  const totalMunicipios = municipiosActivos || municipiosDistintos;

  const operativas = todasLasEstaciones.filter(
    (poste) => (poste.egoera || "").toLowerCase() === "erabilgarri",
  ).length;
  const porcentaje = total > 0 ? Math.round((operativas / total) * 100) : 0;

  document.querySelectorAll("[data-stat]").forEach((elemento) => {
    const clave = elemento.dataset.stat;
    if (clave === "stations") animarContador(elemento, total);
    if (clave === "powerbanks") animarContador(elemento, libres);
    if (clave === "municipalities") animarContador(elemento, totalMunicipios);
    if (clave === "online") animarContador(elemento, porcentaje, "%");
  });
}

function configurarReveal() {
  const elementos = document.querySelectorAll(".reveal");
  if (!elementos.length) return;

  if (!("IntersectionObserver" in window)) {
    elementos.forEach((elemento) => elemento.classList.add("is-visible"));
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("is-visible");
        observador.unobserve(entrada.target);
      });
    },
    { threshold: 0.12 },
  );

  elementos.forEach((elemento) => observador.observe(elemento));
}

function crearMapa() {
  if (!window.L) {
    mapEmpty.classList.remove("d-none");
    return;
  }

  mapa = L.map("map", { scrollWheelZoom: false, zoomControl: false }).setView([43.3183, -1.9812], 12);
  L.control.zoom({ position: "bottomright" }).addTo(mapa);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);

  capaMarcadores = L.layerGroup().addTo(mapa);
  setTimeout(() => mapa.invalidateSize(), 200);
}

function crearPopup(poste) {
  const estado = estadoEstacion(poste);

  const popup = document.createElement("div");
  popup.className = "map-popup";
  popup.append(
    crearElemento("div", "map-popup-title", poste.izena),
    crearElemento(
      "div",
      "map-popup-address",
      [poste.udalerria_izena, poste.helbidea].filter(Boolean).join(" · "),
    ),
  );

  const badge = crearElemento(
    "span",
    `pb-badge ${estado.badge}`,
    estado.operativa && estado.libres > 0 ? `${estado.libres} disponible(s)` : estado.etiqueta,
  );
  popup.appendChild(badge);

  const actions = crearElemento("div", "map-popup-actions");
  const link = crearElemento("a", "btn btn-primary btn-sm", "Reservar");
  link.href = `puesto-Carga.html?id=${poste.id}`;
  actions.appendChild(link);
  popup.appendChild(actions);

  return popup;
}

function iconoMarcador(poste) {
  const estado = estadoEstacion(poste);

  return L.divIcon({
    className: `station-marker ${estado.markerClass}`,
    html: '<span class="station-marker-core"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
}

function renderizarMapa(elementos) {
  if (!mapa) crearMapa();
  if (!mapa || !capaMarcadores) return;

  capaMarcadores.clearLayers();
  const puntos = [];

  elementos.forEach((poste) => {
    if (poste.latitud == null || poste.longitud == null) return;

    const punto = [Number(poste.latitud), Number(poste.longitud)];
    puntos.push(punto);

    const marcador = L.marker(punto, { icon: iconoMarcador(poste) });
    marcador.bindPopup(crearPopup(poste));
    marcador.addTo(capaMarcadores);
  });

  mapEmpty.classList.toggle("d-none", puntos.length > 0);

  if (puntos.length > 0) {
    mapa.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 14 });
  }
}
