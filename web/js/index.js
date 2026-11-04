const lista = document.getElementById("lista");
const stationsCount = document.getElementById("stationsCount");
const municipalityFilter = document.getElementById("municipalityFilter");
const mapEmpty = document.getElementById("mapEmpty");

let todasLasEstaciones = [];
let municipios = [];
let mapa = null;
let capaMarcadores = null;

document.addEventListener("DOMContentLoaded", Datuak);
municipalityFilter.addEventListener("change", aplicarFiltro);

async function Datuak() {
  try {
    todasLasEstaciones = await apiRequest("/kargaguneak");

    try {
      municipios = await apiRequest("/udalerriak");
    } catch (error) {
      console.warn("No se pudieron cargar los municipios:", error);
      municipios = [];
    }

    renderizarMunicipios();
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

function estacionesFiltradas() {
  const municipalityId = municipalityFilter.value;
  if (!municipalityId) return todasLasEstaciones;
  return todasLasEstaciones.filter((poste) => String(poste.udalerria_id) === municipalityId);
}

function aplicarFiltro() {
  const filtradas = estacionesFiltradas();
  renderizarLista(filtradas);
  renderizarMapa(filtradas);
}

function renderizarLista(elementos) {
  lista.replaceChildren();
  stationsCount.textContent = `${elementos.length} estación(es) en la red`;

  if (!elementos.length) {
    const empty = crearElemento("div", "pb-empty");
    empty.innerHTML = '<i class="fas fa-location-dot"></i><p class="mb-0">No hay estaciones para este filtro.</p>';
    lista.appendChild(empty);
    return;
  }

  elementos.forEach((poste) => {
    const operativa = (poste.egoera || "").toLowerCase() === "erabilgarri";
    const libres = operativa ? poste.libres || 0 : 0;

    const a = crearElemento("a", "list-group-item list-group-item-action estacion-item p-3 p-md-4");
    a.href = `puesto-Carga.html?id=${poste.id}`;

    const row = crearElemento("div", "d-flex justify-content-between align-items-center gap-3");

    const main = crearElemento("div", "station-main");
    const icon = crearElemento("div", "station-icon");
    icon.innerHTML = '<i class="fas fa-bolt"></i>';

    const info = crearElemento("div");
    info.append(
      crearElemento("span", "station-name", poste.izena),
      crearElemento(
        "span",
        "station-address",
        [poste.udalerria_izena, poste.helbidea].filter(Boolean).join(" · ") || "Sin dirección",
      ),
    );
    main.append(icon, info);

    const status = crearElemento("div", "station-status");
    const detail = crearElemento(
      "small",
      "",
      !operativa ? "No operativa" : libres > 0 ? `${libres} disponible(s)` : "Sin disponibilidad ahora",
    );
    const badgeClass = !operativa
      ? "pb-badge-muted"
      : libres > 0
        ? "pb-badge-success"
        : "pb-badge-danger";
    const badge = crearElemento(
      "span",
      `pb-badge ${badgeClass}`,
      !operativa ? "Cerrada" : libres > 0 ? "Disponible" : "Vacía",
    );
    const dot = crearElemento("span", `bg-${operativa && libres > 0 ? "success" : "danger"} rounded-circle`);
    dot.style.cssText = "width: 12px; height: 12px;";

    status.append(detail, badge, dot);
    row.append(main, status);
    a.appendChild(row);
    lista.appendChild(a);
  });
}

function crearMapa() {
  if (!window.L) {
    mapEmpty.classList.remove("d-none");
    return;
  }

  mapa = L.map("map", { scrollWheelZoom: false }).setView([43.3183, -1.9812], 12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);

  capaMarcadores = L.layerGroup().addTo(mapa);
  setTimeout(() => mapa.invalidateSize(), 200);
}

function crearPopup(poste) {
  const operativa = (poste.egoera || "").toLowerCase() === "erabilgarri";
  const libres = operativa ? poste.libres || 0 : 0;

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

  const badgeClass = !operativa
    ? "pb-badge-muted"
    : libres > 0
      ? "pb-badge-success"
      : "pb-badge-danger";
  popup.appendChild(
    crearElemento(
      "span",
      `pb-badge ${badgeClass}`,
      !operativa ? "Cerrada" : libres > 0 ? `${libres} disponible(s)` : "Vacía",
    ),
  );

  const actions = crearElemento("div", "map-popup-actions");
  const link = crearElemento("a", "btn btn-primary btn-sm", "Reservar");
  link.href = `puesto-Carga.html?id=${poste.id}`;
  actions.appendChild(link);
  popup.appendChild(actions);

  return popup;
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

    const marcador = L.marker(punto);
    marcador.bindPopup(crearPopup(poste));
    marcador.addTo(capaMarcadores);
  });

  mapEmpty.classList.toggle("d-none", puntos.length > 0);

  if (puntos.length > 0) {
    mapa.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 14 });
  }
}
