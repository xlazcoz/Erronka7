document.addEventListener("DOMContentLoaded", actualizarBotonNavbar);

async function actualizarBotonNavbar() {
    const btnCuenta = document.getElementById("btnCuenta");
    if (!btnCuenta) return;

    try {
        const usuario = await apiRequest("/login/me");
        btnCuenta.className = "btn btn-outline-danger px-3";
        btnCuenta.innerHTML = '<i class="fas fa-right-from-bracket me-2"></i>Cerrar sesión';
        btnCuenta.href = "#";
        btnCuenta.onclick = async (event) => {
            event.preventDefault();
            await cerrarSesion();
        };
        actualizarBotonQR(usuario);
    } catch (error) {
        if (error.status !== 401) {
            console.error("No se pudo comprobar la sesión:", error);
            btnCuenta.innerHTML = '<i class="fas fa-right-to-bracket me-2"></i>Iniciar sesión';
            btnCuenta.title = error.message;
            ocultarBotonQR();
            return;
        }

        btnCuenta.className = "btn btn-outline-primary px-3";
        btnCuenta.innerHTML = '<i class="fas fa-right-to-bracket me-2"></i>Iniciar sesión';
        btnCuenta.href = "Login.html";
        btnCuenta.onclick = null;
        ocultarBotonQR();
    }
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

    const minutos = Math.max(0, Math.ceil((new Date(proxima.hasiera_data_ordua).getTime() - now) / 60000));
    const etiqueta = btnQR.querySelector("span");

    btnQR.href = `Erreserbak.html?qr=${proxima.id}`;
    btnQR.title = minutos > 0 ? `Tu reserva empieza en ${minutos} min` : "Abrir QR de la reserva";
    if (etiqueta) {
        etiqueta.textContent = minutos > 0 ? `QR · ${minutos} min` : "Usar QR";
    }
    btnQR.classList.remove("d-none");
}

function ocultarBotonQR() {
    document.getElementById("qrQuickButton")?.classList.add("d-none");
}

async function cerrarSesion() {
    try {
        await apiRequest("/login/logout", { method: "POST" });
        window.location.href = "index.html";
    } catch (error) {
        if (typeof mostrarDialogo === "function") {
            await mostrarDialogo(`No se pudo cerrar la sesión: ${error.message}`, {
                title: "Error al cerrar sesión",
                type: "error",
            });
        } else {
            console.error("No se pudo cerrar la sesión:", error);
        }
    }
}
