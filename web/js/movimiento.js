/* ============================================================
   Movimiento compartido · Powerbank
   Transiciones entre páginas y utilidades FLIP.
   ============================================================ */
(() => {
  "use strict";

  const DURACION_SALIDA = 170;

  // Se añade antes de pintar para que la entrada de página no parpadee.
  document.documentElement.classList.add("pb-js");

  function prefiereMenosMovimiento() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Guarda la posición actual de los elementos para animarlos después
   * de un re-render (técnica FLIP).
   */
  function capturarPosiciones(contenedor, selector) {
    const posiciones = new Map();
    if (!contenedor) return posiciones;

    contenedor.querySelectorAll(selector).forEach((elemento) => {
      const clave = elemento.dataset.clave;
      if (clave == null) return;
      posiciones.set(clave, elemento.getBoundingClientRect());
    });

    return posiciones;
  }

  /**
   * Anima los elementos desde su posición anterior hasta la actual.
   * Solo se mueve en X/Y para no deformar el contenido de las tarjetas.
   */
  function reproducirFLIP(contenedor, posiciones, selector, { duracion = 360 } = {}) {
    if (!contenedor || !posiciones.size || prefiereMenosMovimiento()) return;

    contenedor.querySelectorAll(selector).forEach((elemento) => {
      const clave = elemento.dataset.clave;
      if (clave == null) return;

      const antes = posiciones.get(clave);
      if (!antes || typeof elemento.animate !== "function") return;

      const despues = elemento.getBoundingClientRect();
      const dx = antes.left - despues.left;
      const dy = antes.top - despues.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      elemento.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: duracion, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    });
  }

  function esNavegacionInterna(enlace) {
    if (!enlace || !(enlace instanceof Element)) return false;
    if (enlace.target && enlace.target !== "_self") return false;
    if (enlace.hasAttribute("download")) return false;
    if (enlace.dataset.sinTransicion !== undefined) return false;

    const href = enlace.getAttribute("href");
    if (!href || href.startsWith("#")) return false;

    let url;
    try {
      url = new URL(enlace.href, window.location.href);
    } catch {
      return false;
    }

    if (url.origin !== window.location.origin) return false;
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.href === window.location.href) return false;
    if (url.pathname !== "/" && !/\.html?$/i.test(url.pathname)) return false;

    return url;
  }

  let saliendo = false;

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const enlace = event.target.closest("a[href]");
    if (!enlace) return;

    const destino = esNavegacionInterna(enlace);
    if (!destino) return;

    // Con movimiento reducido se navega de forma normal.
    if (prefiereMenosMovimiento()) return;
    if (saliendo) return;

    event.preventDefault();
    saliendo = true;
    document.body.classList.add("is-leaving");
    window.setTimeout(() => {
      window.location.href = destino.href;
    }, DURACION_SALIDA);
  });

  // Al volver con el botón "atrás" el navegador puede restaurar la página
  // desde bfcache con la clase de salida puesta.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    saliendo = false;
    document.body?.classList.remove("is-leaving");
  });

  window.PBMovimiento = {
    prefiereMenosMovimiento,
    capturarPosiciones,
    reproducirFLIP,
  };
})();
