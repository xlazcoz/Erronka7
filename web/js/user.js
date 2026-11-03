let usuarioActual = null;

document.addEventListener("DOMContentLoaded", cargarPerfil);

async function cargarPerfil() {
    try {
        usuarioActual = await apiRequest("/login/me");
        document.getElementById("izena").textContent =
            `${usuarioActual.izena} ${usuarioActual.abizena}`.trim();
        document.getElementById("nombreform").value = usuarioActual.izena || "";
        document.getElementById("apellidoform").value = usuarioActual.abizena || "";
        document.getElementById("emailform").value = usuarioActual.login_email || "";
        renderizarTablaReservas(usuarioActual.erreserbak || []);
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "Login.html";
        } else {
            await mostrarDialogo(`No se pudo cargar el perfil: ${error.message}`, {
                title: "Error al cargar el perfil",
                type: "error",
            });
        }
    }
}

async function cambios(event) {
    event.preventDefault();
    if (!usuarioActual) return;

    try {
        usuarioActual = await apiRequest(`/erabiltzaileak/${usuarioActual.id}`, {
            method: "PATCH",
            body: {
                izena: document.getElementById("nombreform").value.trim(),
                abizena: document.getElementById("apellidoform").value.trim(),
                login_email: document.getElementById("emailform").value.trim(),
            },
        });
        document.getElementById("izena").textContent =
            `${usuarioActual.izena} ${usuarioActual.abizena}`.trim();
        await mostrarDialogo("Perfil actualizado.", {
            title: "Cambios guardados",
            type: "success",
        });
    } catch (error) {
        await mostrarDialogo(`No se pudieron guardar los cambios: ${error.message}`, {
            title: "Error al guardar",
            type: "error",
        });
    }
}

function renderizarTablaReservas(reservas) {
    const tablaBody = document.getElementById("tablaReservasBody");
    tablaBody.replaceChildren();

    if (reservas.length === 0) {
        const fila = tablaBody.insertRow();
        const celda = fila.insertCell();
        celda.colSpan = 6;
        celda.className = "text-center text-muted";
        celda.textContent = "No tienes reservas registradas.";
        return;
    }

    reservas.forEach((reserva) => {
        const fila = tablaBody.insertRow();
        const valores = [
            `#${reserva.id}`,
            `Puesto ${reserva.hasierako_karga_postua}`,
            new Date(reserva.hasiera_data_ordua).toLocaleDateString(),
            `${new Date(reserva.hasiera_data_ordua).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(reserva.amaiera_data_ordua).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            reserva.egoera,
        ];
        valores.forEach((valor) => {
            fila.insertCell().textContent = valor;
        });

        const acciones = fila.insertCell();
        acciones.className = "text-center";
        if (reserva.egoera === "aktiboa") {
            const boton = document.createElement("button");
            boton.className = "btn btn-outline-danger btn-sm";
            boton.textContent = "Cancelar";
            boton.addEventListener("click", () => cancelarReserva(reserva.id));
            acciones.appendChild(boton);
        } else {
            acciones.textContent = "-";
        } 
    });
}   
async function cancelarReserva(reservaId) {
    const confirmado = await confirmarDialogo("¿Quieres cancelar esta reserva?", {
        title: "Cancelar reserva",
    });
    if (!confirmado) return;

    try {
        await apiRequest(`/erreserbak/${reservaId}/egoera`, {
            method: "PATCH",
            body: { egoera: "ezeztatua" },
        });
        await cargarPerfil();
        await mostrarDialogo("La reserva se ha cancelado.", {
            title: "Reserva cancelada",
            type: "success",
        });
    } catch (error) {
        await mostrarDialogo(`No se pudo cancelar la reserva: ${error.message}`, {
            title: "Error al cancelar",
            type: "error",
        });
    }
}