const lista = document.getElementById("lista");
const stationsCount = document.getElementById("stationsCount");
const municipalityFilter = document.getElementById("municipalityFilter");
const mapEmpty = document.getElementById("mapEmpty");
const stationSearch = document.getElementById("stationSearch");
const onlyAvailable = document.getElementById("onlyAvailable");
const stationSort = document.getElementById("stationSort");
const btnRefresh = document.getElementById("btnRefresh");

const INTERVALO_REFRESCO = 30000;
const ESPERA_BUSQUEDA = 140;

let todasLasEstaciones = [];
let municipios = [];
let mapa = null;
let capaMarcadores = null;
let soloDisponibles = false;

let primeraCarga = true;
let refrescoEnCurso = false;
let temporizadorRefresco = null;
let temporizadorBusqueda = null;
let estacionesCambiadas = new Set();

let marcadoresPorEstacion = new Map();
let tarjetasPorEstacion = new Map();
let mapaVisible = false;
let firmaEstadoMapa = "";
let firmaPuntosMapa = "";

document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  configurarInteracciones();
  configurarReveal();
  configurarHaloTarjetas();
  configurarVisibilidadMapa();
  iniciarAutoRefresco();
  Datuak();
});

function configurarInteracciones() {
  municipalityFilter.addEventListener("change", () => aplicarFiltro());
  stationSort.addEventListener("change", () => aplicarFiltro());

  stationSearch.addEventListener("input", () => {
    window.clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = window.setTimeout(() => aplicarFiltro(), ESPERA_BUSQUEDA);
  });

  onlyAvailable.addEventListener("click", () => {
    soloDisponibles = !soloDisponibles;
    onlyAvailable.setAttribute("aria-pressed", String(soloDisponibles));
    aplicarFiltro();
  });

  btnRefresh.addEventListener("click", () => Datuak());
}

async function Datuak({ silencioso = false } = {}) {
  if (refrescoEnCurso) return;
  refrescoEnCurso = true;

  if (!silencioso) btnRefresh.classList.add("is-loading");

  const anteriores = new Map(
    todasLasEstaciones.map((poste) => [String(poste.id), claveEstado(poste)]),
  );

  try {
    const nuevas = await apiRequest("/kargaguneak");

    try {
      municipios = await apiRequest("/udalerriak");
    } catch (error) {
      console.warn("Ezin izan dira udalerriak kargatu:", error);
      municipios = [];
    }

    const cambios = detectarCambios(anteriores, nuevas);
    todasLasEstaciones = nuevas;
    estacionesCambiadas = primeraCarga ? new Set() : cambios;

    renderizarMunicipios();
    actualizarEstadisticas();

    // Si nada ha cambiado no se repinta la lista: evita parpadeos y
    // conserva el foco y el estado de los filtros.
    if (primeraCarga || cambios.size > 0) {
      aplicarFiltro({ entrada: primeraCarga });
    }

    primeraCarga = false;
  } catch (error) {
    console.error("Ezin izan dira kargaguneak kargatu:", error);

    // Un refresco automático fallido no debe borrar lo que ya se ve.
    if (silencioso && todasLasEstaciones.length > 0) return;

    lista.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "pb-empty";
    empty.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
    const message = document.createElement("p");
    message.className = "mb-0";
    message.textContent = `Ezin izan dira kargaguneak kargatu: ${error.message}`;
    empty.appendChild(message);
    lista.appendChild(empty);
    stationsCount.textContent = "Konexio-errorea";
  } finally {
    btnRefresh.classList.remove("is-loading");
    refrescoEnCurso = false;
  }
}

function iniciarAutoRefresco() {
  window.clearInterval(temporizadorRefresco);

  temporizadorRefresco = window.setInterval(() => {
    if (document.visibilityState === "visible") Datuak({ silencioso: true });
  }, INTERVALO_REFRESCO);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") Datuak({ silencioso: true });
  });
}

function claveEstado(poste) {
  return `${poste.egoera}|${poste.libres}|${(poste.karga_postuak || []).length}|${poste.udalerria_id}`;
}

function detectarCambios(anteriores, nuevas) {
  const cambios = new Set();

  nuevas.forEach((poste) => {
    const id = String(poste.id);
    if (!anteriores.has(id) || anteriores.get(id) !== claveEstado(poste)) {
      cambios.add(id);
    }
  });

  return cambios;
}

function crearElemento(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderizarMunicipios() {
  const seleccionado = municipalityFilter.value;

  municipalityFilter.replaceChildren();

  const allOption = crearElemento("option", "", "Udalerri guztiak");
  allOption.value = "";
  municipalityFilter.appendChild(allOption);

  municipios
    .filter((municipio) => municipio.aktiboa !== false)
    .forEach((municipio) => {
      const option = crearElemento("option", "", municipio.izena);
      option.value = String(municipio.id);
      municipalityFilter.appendChild(option);
    });

  municipalityFilter.value = seleccionado;
  if (municipalityFilter.value !== seleccionado) municipalityFilter.value = "";
}

function estadoEstacion(poste) {
  const operativa = (poste.egoera || "").toLowerCase() === "erabilgarri";
  const libres = operativa ? poste.libres || 0 : 0;
  const total = (poste.karga_postuak || []).length;
  const porcentaje = total > 0 ? Math.min(100, Math.round((libres / total) * 100)) : 0;

  let etiqueta = "Eskura";
  let badge = "pb-badge-success";
  let detalle = `${libres} powerbank erabilgarri`;
  let cardClass = "is-available";
  let markerClass = "is-available";

  if (!operativa) {
    const cerrada = (poste.egoera || "").toLowerCase() === "mantentze-lanetan";
    etiqueta = cerrada ? "Mantentzean" : "Itxita";
    badge = "pb-badge-muted";
    detalle = cerrada ? "Mantentze-lanetan" : "Zerbitzutik kanpo";
    cardClass = "is-closed";
    markerClass = "is-closed";
  } else if (libres === 0) {
    etiqueta = "Powerbankik ez";
    badge = "pb-badge-danger";
    detalle = "Momentu honetan ez dago powerbankik";
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

function aplicarFiltro({ entrada = false } = {}) {
  const filtradas = estacionesFiltradas();
  const posiciones = window.PBMovimiento
    ? window.PBMovimiento.capturarPosiciones(lista, ".estacion-item")
    : new Map();

  renderizarLista(filtradas, entrada);
  renderizarMapa(filtradas);

  if (window.PBMovimiento) {
    window.PBMovimiento.reproducirFLIP(lista, posiciones, ".estacion-item");
  }

  marcarCambios();
}

function limpiarFiltros() {
  municipalityFilter.value = "";
  stationSearch.value = "";
  stationSort.value = "recomendado";
  soloDisponibles = false;
  onlyAvailable.setAttribute("aria-pressed", "false");
  aplicarFiltro();
}

function renderizarLista(elementos, animarEntrada) {
  lista.replaceChildren();
  tarjetasPorEstacion = new Map();

  if (filtrosActivos()) {
    stationsCount.textContent = `${elementos.length} emaitza ${todasLasEstaciones.length} kargagunetatik`;
  } else {
    stationsCount.textContent = `${elementos.length} kargagune sarean`;
  }

  if (!elementos.length) {
    const empty = crearElemento("div", "pb-empty");
    empty.innerHTML = '<i class="fas fa-location-dot"></i>';

    const texto = crearElemento(
      "p",
      filtrosActivos() ? "mb-3" : "mb-0",
      filtrosActivos()
        ? "Ez dago kargagunerik hautatutako iragazkiekin bat egiten duenik."
        : "Ez dago kargagunerik iragazki honetarako.",
    );
    empty.appendChild(texto);

    if (filtrosActivos()) {
      const reset = crearElemento("button", "btn btn-outline-primary btn-sm", "Kendu iragazkiak");
      reset.type = "button";
      reset.addEventListener("click", limpiarFiltros);
      empty.appendChild(reset);
    }

    lista.appendChild(empty);
    return;
  }

  elementos.forEach((poste, indice) => {
    const estado = estadoEstacion(poste);
    const id = String(poste.id);

    const a = crearElemento("a", `estacion-item ${estado.cardClass}${animarEntrada ? " animate-in" : ""}`);
    a.href = `puesto-Carga.html?id=${poste.id}&reservar=1`;
    a.dataset.clave = id;
    a.style.setProperty("--i", String(indice));
    a.setAttribute("aria-label", `Ikusi ${poste.izena} kargagunea`);

    a.addEventListener("pointerenter", (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      resaltarEstacion(poste);
    });
    a.addEventListener("focus", () => resaltarEstacion(poste));
    a.addEventListener("pointerleave", () => quitarResaltado(poste));
    a.addEventListener("blur", () => quitarResaltado(poste));

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
        [poste.udalerria_izena, poste.helbidea].filter(Boolean).join(" · ") || "Helbiderik gabe",
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
        estado.total > 0
          ? `${estado.total} powerbanketatik`
          : "powerbankik ez",
      ),
    );
    disponibilidad.append(cabecera, crearBateria(estado));

    const cta = crearElemento("span", "station-cta");
    cta.innerHTML = 'Erreserbatu <i class="fas fa-arrow-right" aria-hidden="true"></i>';

    a.append(lead, disponibilidad, cta);
    lista.appendChild(a);
    tarjetasPorEstacion.set(id, a);
  });
}

function crearBateria(estado) {
  const bateria = crearElemento("div", "station-battery");
  bateria.setAttribute("role", "img");
  bateria.setAttribute(
    "aria-label",
    `Erabilgarritasuna: ${estado.porcentaje}%. ${estado.libres} powerbank libre ${estado.total} powerbanketatik`,
  );

  if (estado.operativa && estado.libres > 0) {
    bateria.classList.add("is-charging");
  }

  bateria.title = `${estado.total} powerbank kargagunean · ${estado.libres} libre`;

  // Un segmento por cada powerbank posible en el punto: si la estación
  // tiene 2, se ven 2 barras grandes; si tiene 6, se ven 6.
  const totalSegmentos = Math.max(1, estado.total);
  const encendidos = Math.min(estado.libres, totalSegmentos);
  bateria.style.setProperty("--segmentos", String(totalSegmentos));

  for (let indice = 0; indice < totalSegmentos; indice += 1) {
    const segmento = crearElemento("span", "station-battery-segment");
    if (indice < encendidos) {
      segmento.classList.add("is-on");
      segmento.style.setProperty("--delay", `${indice * 70}ms`);
    }
    bateria.appendChild(segmento);
  }

  bateria.appendChild(crearElemento("span", "station-battery-cap"));
  return bateria;
}

function marcarCambios() {
  if (!estacionesCambiadas.size) return;

  const cambiadas = estacionesCambiadas;
  estacionesCambiadas = new Set();

  lista.querySelectorAll(".estacion-item").forEach((tarjeta) => {
    if (!cambiadas.has(tarjeta.dataset.clave)) return;

    tarjeta.classList.add("is-updated");
    window.setTimeout(() => tarjeta.classList.remove("is-updated"), 1500);
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

function configurarHaloTarjetas() {
  if (!lista) return;

  lista.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    if (!(event.target instanceof Element)) return;

    const tarjeta = event.target.closest(".estacion-item");
    if (!tarjeta) return;

    const rect = tarjeta.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    tarjeta.style.setProperty("--mx", `${x}px`);
    tarjeta.style.setProperty("--my", `${y}px`);

    if (window.PBMovimiento?.prefiereMenosMovimiento()) return;

    const ry = ((x / rect.width - 0.5) * 3).toFixed(2);
    const rx = ((y / rect.height - 0.5) * -3).toFixed(2);

    tarjeta.classList.add("is-tilting");
    tarjeta.style.setProperty("--rx", `${rx}deg`);
    tarjeta.style.setProperty("--ry", `${ry}deg`);
  });

  lista.addEventListener("pointerout", (event) => {
    if (!(event.target instanceof Element)) return;

    const tarjeta = event.target.closest(".estacion-item");
    if (!tarjeta) return;
    if (event.relatedTarget instanceof Node && tarjeta.contains(event.relatedTarget)) return;

    tarjeta.classList.remove("is-tilting");
    tarjeta.style.setProperty("--rx", "0deg");
    tarjeta.style.setProperty("--ry", "0deg");
  });
}

function configurarVisibilidadMapa() {
  const contenedor = document.getElementById("map");
  if (!contenedor) return;

  if (!("IntersectionObserver" in window)) {
    mapaVisible = true;
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      mapaVisible = entradas.some((entrada) => entrada.isIntersecting);
    },
    { threshold: 0.25 },
  );

  observador.observe(contenedor);
}

function resaltarEstacion(poste) {
  const marcador = marcadoresPorEstacion.get(String(poste.id));
  if (!marcador) return;

  marcador.getElement()?.classList.add("is-active");

  if (!mapa || !mapaVisible) return;
  if (poste.latitud == null || poste.longitud == null) return;

  mapa.flyTo(
    [Number(poste.latitud), Number(poste.longitud)],
    Math.max(mapa.getZoom(), 14),
    { duration: 0.7 },
  );
}

function quitarResaltado(poste) {
  const marcador = marcadoresPorEstacion.get(String(poste.id));
  marcador?.getElement()?.classList.remove("is-active");
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
    estado.operativa && estado.libres > 0 ? `${estado.libres} erabilgarri` : estado.etiqueta,
  );
  popup.appendChild(badge);

  const actions = crearElemento("div", "map-popup-actions");
  const link = crearElemento("a", "btn btn-primary btn-sm", "Erreserbatu");
  link.href = `puesto-Carga.html?id=${poste.id}&reservar=1`;
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

  const conUbicacion = elementos.filter(
    (poste) => poste.latitud != null && poste.longitud != null,
  );

  const firmaPuntos = conUbicacion
    .map((poste) => `${poste.id}:${poste.latitud}:${poste.longitud}`)
    .join("|");
  const firmaEstado = conUbicacion
    .map((poste) => `${poste.id}:${poste.egoera}:${poste.libres}:${(poste.karga_postuak || []).length}`)
    .join("|");

  mapEmpty.classList.toggle("d-none", conUbicacion.length > 0);

  // Sin cambios reales no se recrean los marcadores (ni se pierde el zoom).
  if (firmaEstado === firmaEstadoMapa) return;

  const puntosCambiaron = firmaPuntos !== firmaPuntosMapa;
  firmaEstadoMapa = firmaEstado;
  firmaPuntosMapa = firmaPuntos;

  capaMarcadores.clearLayers();
  marcadoresPorEstacion = new Map();

  const puntos = [];

  conUbicacion.forEach((poste) => {
    const punto = [Number(poste.latitud), Number(poste.longitud)];
    const id = String(poste.id);
    puntos.push(punto);

    const marcador = L.marker(punto, { icon: iconoMarcador(poste) });
    marcador.bindPopup(crearPopup(poste));
    marcador.addTo(capaMarcadores);

    marcadoresPorEstacion.set(id, marcador);
    marcador.on("mouseover", () => tarjetasPorEstacion.get(id)?.classList.add("is-linked"));
    marcador.on("mouseout", () => tarjetasPorEstacion.get(id)?.classList.remove("is-linked"));
  });

  if (puntos.length === 0) return;

  if (puntosCambiaron || primeraCarga) {
    mapa.fitBounds(L.latLngBounds(puntos), {
      padding: [40, 40],
      maxZoom: 14,
      animate: !window.PBMovimiento?.prefiereMenosMovimiento(),
    });
  }
}
