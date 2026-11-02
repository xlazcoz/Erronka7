const Id = "1"; 
const url = "http://127.0.0.1:8000/erabiltzaileak/" + Id;

const izena = document.getElementById("izena");
const nombreform = document.getElementById("nombreform");
const apellidoform = document.getElementById("apellidoform");
const emailform = document.getElementById("emailform");

// Cargar los datos automáticamente al cargar la página
document.addEventListener("DOMContentLoaded", Datuak);

async function Datuak() {
    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) {
            throw new Error(`Error en la petición: ${respuesta.status}`);
        }
        const datos = await respuesta.json();
        informazioa(datos);
    } catch (error) {
        console.error('Hubo un problema con la petición Fetch:', error);
    }
}

function informazioa(datos) {
    izena.textContent = `${datos.izena} ${datos.abizena}`;
    nombreform.value = datos.izena;
    apellidoform.value = datos.abizena;
    emailform.value = datos.login_email;
}

async function cambios(e) {
    // Evita que el formulario recargue la página
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
            throw new Error(`Error al guardar: ${respuesta.status}`);
        }

        const datosServidor = await respuesta.json();
        
        informazioa(datosServidor);
        alert("¡Datos guardados correctamente!");

    } catch (error) {
        console.error("Error al actualizar en la API:", error);
        alert("Hubo un error al guardar los cambios.");
    }
}



// meter un boton para cerrar sesion este es un ejemplo de como funcionaria

const btnCerrar = document.getElementById("cerrarSesion");
if (btnCerrar) {
    btnCerrar.addEventListener("click", () => {
        sessionStorage.removeItem("usuarioRegistrado");
        window.location.href = "login.html";
    });
}