document.addEventListener("DOMContentLoaded", actualizarBotonNavbar);

async function actualizarBotonNavbar() {
    const btnCuenta = document.getElementById("btnCuenta");
    if (!btnCuenta) return;

    try {
        await apiRequest("/login/me");
        btnCuenta.className = "btn btn-danger me-2";
        btnCuenta.textContent = "Cerrar sesión";
        btnCuenta.href = "#";
        btnCuenta.onclick = async (e) => {
            e.preventDefault();
            await cerrarSesion();
        };
    } catch (error) {
        if (error.status !== 401) {
            console.error("No se pudo comprobar la sesión:", error);
            btnCuenta.textContent = "Iniciar sesión";
            btnCuenta.title = error.message;
            return;
        }

        btnCuenta.className = "btn btn-primary me-2";
        btnCuenta.textContent = "Iniciar sesión";
        btnCuenta.href = "Login.html";
        btnCuenta.onclick = null;
    }
}

async function cerrarSesion() {
    try {
        await apiRequest("/login/logout", { method: "POST" });
        window.location.href = "index.html";
    } catch (error) {
        await mostrarDialogo(`No se pudo cerrar la sesión: ${error.message}`, {
            title: "Error al cerrar sesión",
            type: "error",
        });
    }
}