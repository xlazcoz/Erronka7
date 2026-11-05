const INTERVALO_EGUNERATU = 30000;

document.addEventListener("DOMContentLoaded", () => {
  Datuak();
  window.setInterval(() => {
    if (document.visibilityState === "visible") Datuak();
  }, INTERVALO_EGUNERATU);
});

async function Datuak() {
  try {
    const estaciones = await apiRequest("/kargaguneak");

    let municipios = [];
    try {
      municipios = await apiRequest("/udalerriak");
    } catch (error) {
      console.warn("Ezin izan dira udalerriak kargatu:", error);
    }

    const libres = estaciones.reduce((total, estacion) => {
      const operativa = (estacion.egoera || "").toLowerCase() === "erabilgarri";
      return total + (operativa ? estacion.libres || 0 : 0);
    }, 0);

    const municipiosActivos = municipios.filter((municipio) => municipio.aktiboa !== false).length;
    const municipiosDistintos = new Set(
      estaciones.map((estacion) => estacion.udalerria_izena).filter(Boolean)
    ).size;

    const operativas = estaciones.filter(
      (estacion) => (estacion.egoera || "").toLowerCase() === "erabilgarri"
    ).length;
    const porcentaje =
      estaciones.length > 0 ? Math.round((operativas / estaciones.length) * 100) : 0;

    document.querySelectorAll("[data-stat]").forEach((elemento) => {
      const clave = elemento.dataset.stat;
      if (clave === "stations") animarContador(elemento, estaciones.length);
      if (clave === "powerbanks") animarContador(elemento, libres);
      if (clave === "municipalities") {
        animarContador(elemento, municipiosActivos || municipiosDistintos);
      }
      if (clave === "online") animarContador(elemento, porcentaje, "%");
    });
  } catch (error) {
    console.error("Ezin izan dira estatistikak kargatu:", error);
    document.querySelectorAll("[data-stat]").forEach((elemento) => {
      if (!elemento.dataset.valor) elemento.textContent = "—";
    });
  }
}

function animarContador(elemento, valor, sufijo = "") {
  if (!elemento) return;

  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducido || typeof elemento.animate !== "function") {
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
