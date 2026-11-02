const Id = "1"; 
const url = "http://127.0.0.1:8000/erabiltzaileak/" + Id;

let izena, nombreform, apellidoform, emailform, btnCerrar;
let datosUsuarioOriginales = {}; 

document.addEventListener("DOMContentLoaded", () => {
    izena = document.getElementById("izena");
    nombreform = document.getElementById("nombreform");
    apellidoform = document.getElementById("apellidoform");
    emailform = document.getElementById("emailform");
    btnCerrar = document.getElementById("cerrarSesion");

    if (btnCerrar) {
        btnCerrar.addEventListener("click", () => {
            sessionStorage.removeItem("usuarioRegistrado");
            window.location.href = "Login.html";
        });
    }

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
    } catch (error) {
        console.error('Hubo un problema con la petición Fetch:', error);
    }
}

function informazioa(datos) {
    if (izena) izena.textContent = `${datos.izena} ${datos.abizena}`;
    if (nombreform) nombreform.value = datos.izena;
    if (apellidoform) apellidoform.value = datos.abizena;
    if (emailform) emailform.value = datos.login_email;
}

async function cambios(e) {
    if (e) e.preventDefault();

    const datosActualizados = {
        ...datosUsuarioOriginales,
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
            console.log("--- DETALLE DEL ERROR 422 ---", errorDetalle);
            throw new Error(`Error ${respuesta.status}`);
        }

        const datosServidor = await respuesta.json();
        datosUsuarioOriginales = datosServidor;
        informazioa(datosServidor);

    } catch (error) {
        console.error("Error al actualizar en la API:", error);
        alert("Hubo un error al guardar los cambios.");
    }
}