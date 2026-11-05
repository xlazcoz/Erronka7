document.addEventListener("DOMContentLoaded", actualizarBotonNavbar);

async function actualizarBotonNavbar() {
  const btnCuenta = document.getElementById("btnCuenta");
  if (!btnCuenta) return;

  try {
    const usuario = await apiRequest("/login/me");
    btnCuenta.className = "btn btn-outline-danger px-3";
    btnCuenta.innerHTML = '<i class="fas fa-right-from-bracket me-2"></i>Amaitu saioa';
    btnCuenta.href = "#";
    btnCuenta.onclick = async (event) => {
      event.preventDefault();
      await cerrarSesion();
    };
    actualizarBotonQR(usuario);
    actualizarEnlaceTaquilla(usuario);
    mostrarEnlacesPrivados(true);
  } catch (error) {
    if (error.status !== 401) {
      console.error("Ezin izan da saioa egiaztatu:", error);
      btnCuenta.innerHTML = '<i class="fas fa-right-to-bracket me-2"></i>Hasi saioa';
      btnCuenta.title = error.message;
      ocultarBotonQR();
      ocultarEnlaceTaquilla();
      mostrarEnlacesPrivados(false);
      return;
    }

    btnCuenta.className = "btn btn-outline-primary px-3";
    btnCuenta.innerHTML = '<i class="fas fa-right-to-bracket me-2"></i>Hasi saioa';
    btnCuenta.href = "Login.html";
    btnCuenta.onclick = null;
    ocultarBotonQR();
    ocultarEnlaceTaquilla();
    mostrarEnlacesPrivados(false);
  }
}

function mostrarEnlacesPrivados(visible) {
  document.querySelectorAll("[data-auth-only]").forEach((elemento) => {
    elemento.hidden = !visible;
  });
}

function actualizarBotonQR(usuario) {
  const btnQR = document.getElementById("qrQuickButton");
  if (!btnQR) return;

  const now = Date.now();
  const margenMs = 30 * 60 * 1000;
  const proxima = (usuario.erreserbak || [])
    .filter((reserva) => reserva.egoera === "aktiboa")
    .find((reserva) => {
      const inicio = new Date(reserva.hasiera_data_ordua).getTime();
      const fin = new Date(reserva.amaiera_data_ordua).getTime();
      return inicio - now <= margenMs && fin > now;
    });

  if (!proxima) {
    ocultarBotonQR();
    return;
  }

  const minutos = Math.max(
    0,
    Math.ceil((new Date(proxima.hasiera_data_ordua).getTime() - now) / 60000)
  );
  const etiqueta = btnQR.querySelector("span");

  btnQR.href = `Erreserbak.html?qr=${proxima.id}`;
  btnQR.title =
    minutos > 0
      ? `Zure erreserba ${minutos} minutu barru hasiko da`
      : "Ireki erreserbaren QR kodea";
  if (etiqueta) {
    etiqueta.textContent = minutos > 0 ? `QR · ${minutos} min` : "Erabili QR";
  }
  btnQR.classList.remove("d-none");
}

function ocultarBotonQR() {
  document.getElementById("qrQuickButton")?.classList.add("d-none");
}

function actualizarEnlaceTaquilla(usuario) {
  const nav = document.querySelector(".pb-nav-pill");
  if (!nav) return;

  let item = document.getElementById("navLocker");

  if (usuario.rola !== "admin") {
    item?.remove();
    return;
  }

  if (!item) {
    item = document.createElement("li");
    item.className = "nav-item";
    item.id = "navLocker";

    const link = document.createElement("a");
    link.className = "nav-link";
    link.href = "locker.html";
    link.innerHTML = '<i class="fas fa-qrcode"></i>Taquilla';

    item.appendChild(link);
    nav.appendChild(item);
  }
}

function ocultarEnlaceTaquilla() {
  document.getElementById("navLocker")?.remove();
}

async function cerrarSesion() {
  try {
    await apiRequest("/login/logout", { method: "POST" });
    window.location.href = "index.html";
  } catch (error) {
    if (typeof mostrarDialogo === "function") {
      await mostrarDialogo(`Ezin izan da saioa amaitu: ${error.message}`, {
        title: "Errorea saioa amaitzean",
        type: "error",
      });
    } else {
      console.error("Ezin izan da saioa amaitu:", error);
    }
  }
}
