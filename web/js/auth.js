document.addEventListener("DOMContentLoaded", actualizarBotonNavbar);

async function actualizarBotonNavbar() {
    const btnCuenta = document.getElementById("btnCuenta");
    if (!btnCuenta) return;

    try {
        await apiRequest("/login/me");
        btnCuenta.className = "btn btn-outline-danger px-3";
        btnCuenta.innerHTML = '<i class="fas fa-right-from-bracket me-2"></i>Cerrar sesión';
        btnCuenta.href = "#";
        btnCuenta.onclick = async (event) => {
            event.preventDefault();
            await cerrarSesion();
        };
    } catch (error) {
        if (error.status !== 401) {
            console.error("No se pudo comprobar la sesión:", error);
            btnCuenta.innerHTML = '<i class="fas fa-right-to-bracket me-2"></i>Iniciar sesión';
            btnCuenta.title = error.message;
            return;
        }

        btnCuenta.className = "btn btn-outline-primary px-3";
        btnCuenta.innerHTML = '<i class="fas fa-right-to-bracket me-2"></i>Iniciar sesión';
        btnCuenta.href = "Login.html";
        btnCuenta.onclick = null;
    }
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
