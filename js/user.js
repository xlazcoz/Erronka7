const Id = "1";
const url = "http://127.0.0.1:8000/erabiltzaileak/" + Id;

let izena, nombreform, apellidoform, emailform;
let datosUsuarioOriginales = {}; 

document.addEventListener("DOMContentLoaded", () => {
    izena = document.getElementById("izena");
    nombreform = document.getElementById("nombreform");
    apellidoform = document.getElementById("apellidoform");
    emailform = document.getElementById("emailform");

    Datuak();
});

async function Datuak() {
    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) {
            throw new Error(`Error en la petición: ${respuesta.status}`);
        }
        datosUsuarioOriginales = await respuesta.json();
        
        informazioa(datosUsuarioOriginales);
        renderizarTablaReservas(datosUsuarioOriginales.erreserbak);
    } catch (error) {
        console.error('Hubo un problema con la petición Fetch:', error);
    }
}

function informazioa(datos) {
    if (izena) izena.textContent = `${datos.izena} ${datos.abizena}`;
    
    if (nombreform) nombreform.value = datos.izena || "";
    if (apellidoform) apellidoform.value = datos.abizena || "";
    if (emailform) emailform.value = datos.login_email || "";
}

async function cambios(e) {
    if (e) e.preventDefault();

    const datosActualizados = {
        izena: nombreform.value,
        abizena: apellidoform.value,
        login_email: emailform.value
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH", 
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosActualizados)
        });

        if (!respuesta.ok) {
            const errorDetalle = await respuesta.json();
            console.error("--- DETALLE DEL ERROR 422 ---", errorDetalle);
            throw new Error(`Error ${respuesta.status}`);
        }

        const datosServidor = await respuesta.json();
        datosUsuarioOriginales = datosServidor;
        
        informazioa(datosServidor);

    } catch (error) {
        console.error("Error al actualizar en la API:", error);
    }
}

function renderizarTablaReservas(reservas) {
    const tbody = document.getElementById("tablaReservasBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!reservas || reservas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No tienes reservas registradas.</td></tr>`;
        return;
    }

    reservas.forEach(r => {
        const tr = document.createElement("tr");

        const fechaObj = new Date(r.hasiera_data_ordua);
        const fechaFormateada = fechaObj.toLocaleDateString();
        const horaInicio = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const horaFin = new Date(r.amaiera_data_ordua).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let badgeClass = "bg-secondary";
        if (r.egoera === "aktiboa") badgeClass = "bg-success";
        if (r.egoera === "ezeztatua") badgeClass = "bg-danger";

        let botonAccion = `<span class="text-muted small">-</span>`;
        if (r.egoera === "aktiboa") {
            botonAccion = `
                <button class="btn btn-outline-danger btn-sm" onclick="cancelarReserva(${r.id})">
                    <i class="fas fa-times me-1"></i> Cancelar
                </button>
            `;
        }

        tr.innerHTML = `
            <td><strong>#${r.id}</strong></td>
            <td>Puesto ${r.hasierako_karga_postua}</td>
            <td>${fechaFormateada}</td>
            <td>${horaInicio} - ${horaFin}</td>
            <td><span class="badge ${badgeClass}">${r.egoera}</span></td>
            <td class="text-center">${botonAccion}</td>
        `;

        tbody.appendChild(tr);
    });
}

async function cancelarReserva(reservaId) {
    const confirmar = confirm(`¿Estás seguro de que deseas cancelar la reserva #${reservaId}?`);
    if (!confirmar) return;

    try {
        const respuesta = await fetch(`http://127.0.0.1:8000/erreserbak/${reservaId}/egoera`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ egoera: "ezeztatua" })
        });

        if (!respuesta.ok) {
            throw new Error(`Error al cancelar: ${respuesta.status}`);
        }

        Datuak(); 
    } catch (error) {
        console.error("Error al cancelar la reserva:", error);
    }
}