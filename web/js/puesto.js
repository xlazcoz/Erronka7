const urlParams = new URLSearchParams(window.location.search);
const posteId = urlParams.get('id');
const circulo = document.getElementById('mi-circulo');
const estado = document.getElementById("estado");
const mapa = document.getElementById("maps");
const titulo = document.getElementById("titulo");
const imagen1 = document.getElementById("imagen1");
const imagen2 = document.getElementById("imagen2");
const imagen3 = document.getElementById("imagen3");

async function Datuak() {
    try {
        if (!posteId) {
            throw new Error("No se ha indicado una estación.");
        }

        const datos = await apiRequest(`/kargaguneak/${posteId}`);
        cambiarTitulo(datos.izena);
        numeroEstado(datos.libres);
        linkMaps(datos.helbidea);
        cambiarImagenes(datos.irudia1, datos.irudia2, datos.irudia3);

    } catch (error) {
        console.error("No se pudo cargar la estación:", error);
        titulo.textContent = error.message;
        estado.textContent = "";
        document.getElementById("reservationButton").disabled = true;
    }
}

function numeroEstado(numero) {
    circulo.classList.toggle("bg-success", numero > 0);
    circulo.classList.toggle("bg-danger", numero === 0);
    estado.textContent = numero === 0
        ? "No hay ninguna disponible"
        : `Disponibles: ${numero}`;
    document.getElementById("reservationButton").disabled = numero === 0;
}

function linkMaps(address) {
    mapa.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    mapa.textContent = `📍 ${address}`;
}

function cambiarTitulo(texto) {
    titulo.textContent = texto;
}

function cambiarImagenes(ruta1, ruta2, ruta3) {
    imagen1.src = ruta1;
    imagen2.src = ruta2;
    imagen3.src = ruta3;
}

document.getElementById("reservationForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const date = document.getElementById("FechaReserva").value;
    const startTime = document.getElementById("horaReserva").value;
    const endTime = document.getElementById("HoraDevolucion").value;
    if (endTime <= startTime) {
        await mostrarDialogo("La hora de devolución debe ser posterior a la hora de reserva.", {
            title: "Hora no válida",
            type: "error",
        });
        return;
    }

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (start < new Date()) {
        await mostrarDialogo("La fecha de reserva no puede estar en el pasado.", {
            title: "Fecha no válida",
            type: "error",
        });
        return;
    }

    try {
        await apiRequest("/erreserbak", {
            method: "POST",
            body: {
                kargagunea_id: Number(posteId),
                hasiera_data_ordua: start.toISOString(),
                amaiera_data_ordua: end.toISOString(),
            },
        });
        await mostrarDialogo("Reserva creada correctamente.", {
            title: "Reserva confirmada",
            type: "success",
        });
        document.getElementById("Reserva").hidePopover();
        await Datuak();
    } catch (error) {
        await mostrarDialogo(error.status === 401
            ? "Inicia sesión para reservar."
            : `No se pudo crear la reserva: ${error.message}`, {
            title: error.status === 401 ? "Inicia sesión" : "Error al reservar",
            type: "error",
        });
        if (error.status === 401) {
            window.location.href = "Login.html";
        }
    }
});

const today = new Date();
document.getElementById("FechaReserva").min = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
].join("-");

Datuak();