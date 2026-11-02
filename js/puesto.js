const urlParams = new URLSearchParams(window.location.search);
const posteId = urlParams.get('id');

const url = `http://127.0.0.1:8000/kargaguneak/${posteId}`;

const circulo = document.getElementById('mi-circulo');
circulo.addEventListener('click', () => {
    circulo.classList.toggle('bg-danger');
    circulo.classList.toggle('bg-success');
});

let datos = ""; 

async function Datuak() {
    try {
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error(`Error en la petición: ${respuesta.status}`);
        }
        
        datos = await respuesta.json();

        cambiarTitutlo(datos.izena);
        numeroEstado(datos.libres);
        linkMaps(datos.maps);
        cambiarImagenes(datos.irudia1, datos.irudia2, datos.irudia3);

    } catch (error) {
        console.error('Hubo un problema con la petición Fetch:', error);
    }
}

const estado = document.getElementById("estado");

function numeroEstado(numero) {
    if (numero === 0) {
        circulo.classList.remove('bg-success');
        circulo.classList.add('bg-danger');
        estado.innerHTML = "No hay ninguna disponible";
    } else {
        circulo.classList.remove('bg-danger');
        circulo.classList.add('bg-success');
        estado.innerHTML = "Estado: " + numero;
    }
}

const mapa = document.getElementById("maps");

function linkMaps(link) {
    mapa.href = link;
}

const titulo = document.getElementById("titulo");

function cambiarTitutlo(texto) {
    titulo.innerHTML = texto;
}

const imagen1 = document.getElementById("imagen1");
const imagen2 = document.getElementById("imagen2");
const imagen3 = document.getElementById("imagen3");

function cambiarImagenes(ruta1, ruta2, ruta3) {
    imagen1.src = ruta1;
    imagen2.src = ruta2;
    imagen3.src = ruta3;
}

document.addEventListener("DOMContentLoaded", Datuak);