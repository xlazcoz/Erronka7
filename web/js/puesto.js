const urlParams = new URLSearchParams(window.location.search);
const posteId = urlParams.get('id');
const circulo = document.getElementById('mi-circulo');
const estado = document.getElementById("estado");
const mapa = document.getElementById("maps");
const titulo = document.getElementById("titulo");
const imagen1 = document.getElementById("imagen1");
const imagen2 = document.getElementById("imagen2");
const imagen3 = document.getElementById("imagen3");
const kargaPostuakDiv = document.getElementById("kargaPostuak");
const kargaPostuaSelect = document.getElementById("KargaPostua");
const erabilgarritasunMezua = document.getElementById("erabilgarritasunMezua");
const reservationButton = document.getElementById("reservationButton");

let estazioa = null;

async function Datuak() {
    try {
        if (!posteId) {
            throw new Error("No se ha indicado una estación.");
        }

        const datos = await apiRequest(`/kargaguneak/${posteId}`);
        estazioa = datos;
        cambiarTitulo(datos.izena);
        renderizarEstado(datos);
        linkMaps(datos.helbidea);
        cambiarImagenes(datos.irudia1, datos.irudia2, datos.irudia3);
        renderizarPostuak(datos.karga_postuak || []);
        await kargatuErabilgarritasuna();

    } catch (error) {
        console.error("No se pudo cargar la estación:", error);
        titulo.textContent = error.message;
        estado.textContent = "";
        reservationButton.disabled = true;
    }
}

function renderizarEstado(datos) {
    const numero = datos.libres ?? 0;
    const erabilgarri = (datos.egoera || "").toLowerCase() === "erabilgarri";

    circulo.classList.toggle("bg-success", erabilgarri && numero > 0);
    circulo.classList.toggle("bg-danger", !erabilgarri || numero === 0);
    estado.textContent = `${datos.egoera || "Egoera ezezaguna"} · ${numero} libre`;
    reservationButton.disabled = !erabilgarri || numero === 0;
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

function postuKlasa(egoera) {
    if (egoera === "kargatuta") return "bg-success";
    if (egoera === "kargatzen") return "bg-warning text-dark";
    return "bg-secondary";
}

function renderizarPostuak(postuak) {
    kargaPostuakDiv.replaceChildren();

    if (!postuak.length) {
        kargaPostuakDiv.textContent = "Ez dago karga posturik.";
        return;
    }

    postuak.forEach((posta) => {
        const span = document.createElement("span");
        span.className = `badge ${postuKlasa(posta.egoera)}`;
        span.textContent = `#${posta.id} · ${posta.egoera}`;
        kargaPostuakDiv.appendChild(span);
    });
}

function dataOrduak() {
    const date = document.getElementById("FechaReserva").value;
    const startTime = document.getElementById("horaReserva").value;
    const endTime = document.getElementById("HoraDevolucion").value;

    if (!date || !startTime || !endTime) {
        return null;
    }

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return null;
    }

    return { start, end, startTime, endTime };
}

async function kargatuErabilgarritasuna() {
    kargaPostuaSelect.replaceChildren();
    const lehenAukera = document.createElement("option");
    lehenAukera.value = "";
    lehenAukera.textContent = "Aukeratu karga postu bat";
    kargaPostuaSelect.appendChild(lehenAukera);

    const orduak = dataOrduak();
    if (!orduak) {
        erabilgarritasunMezua.textContent = "Aukeratu data, hasiera-ordua eta amaiera-ordua.";
        reservationButton.disabled = true;
        return;
    }

    if (orduak.endTime <= orduak.startTime) {
        erabilgarritasunMezua.textContent = "Amaiera-ordua hasiera-ordua baino geroagokoa izan behar da.";
        reservationButton.disabled = true;
        return;
    }

    if (!estazioa || (estazioa.egoera || "").toLowerCase() !== "erabilgarri") {
        erabilgarritasunMezua.textContent = "Kargagunea ez dago erabilgarri.";
        reservationButton.disabled = true;
        return;
    }

    try {
        const query = new URLSearchParams({
            hasiera_data_ordua: orduak.start.toISOString(),
            amaiera_data_ordua: orduak.end.toISOString(),
        });
        const postuak = await apiRequest(
            `/kargaguneak/${posteId}/erabilgarritasuna?${query.toString()}`,
        );

        if (!postuak.length) {
            erabilgarritasunMezua.textContent = "Ez dago karga postu librerik ordutegi horretan.";
            reservationButton.disabled = true;
            return;
        }

        postuak.forEach((posta) => {
            const option = document.createElement("option");
            option.value = String(posta.id);
            option.textContent = `Karga postua #${posta.id} (${posta.egoera})`;
            kargaPostuaSelect.appendChild(option);
        });

        erabilgarritasunMezua.textContent = `${postuak.length} karga postu libre ordutegi horretan.`;
        reservationButton.disabled = false;
    } catch (error) {
        console.error("No se pudo consultar la disponibilidad:", error);
        erabilgarritasunMezua.textContent = "Ezin izan da erabilgarritasuna kargatu.";
        reservationButton.disabled = true;
    }
}

document.getElementById("reservationForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const orduak = dataOrduak();
    if (!orduak) {
        await mostrarDialogo("Aukeratu data eta ordu baliodunak.", {
            title: "Data edo ordua ez da zuzena",
            type: "error",
        });
        return;
    }

    if (orduak.start < new Date()) {
        await mostrarDialogo("La fecha de reserva no puede estar en el pasado.", {
            title: "Fecha no válida",
            type: "error",
        });
        return;
    }

    const kargaPostuaId = Number(kargaPostuaSelect.value);
    if (!kargaPostuaId) {
        await mostrarDialogo("Aukeratu karga postu bat.", {
            title: "Karga postua beharrezkoa",
            type: "error",
        });
        return;
    }

    try {
        await apiRequest("/erreserbak", {
            method: "POST",
            body: {
                kargagunea_id: Number(posteId),
                karga_postua_id: kargaPostuaId,
                hasiera_data_ordua: orduak.start.toISOString(),
                amaiera_data_ordua: orduak.end.toISOString(),
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

["FechaReserva", "horaReserva", "HoraDevolucion"].forEach((id) => {
    document.getElementById(id).addEventListener("change", kargatuErabilgarritasuna);
});

const today = new Date();
document.getElementById("FechaReserva").min = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
].join("-");

Datuak();
