const circulo = document.getElementById('mi-circulo');
        circulo.addEventListener('click', () => {
            circulo.classList.toggle('bg-danger');
            circulo.classList.toggle('bg-success');
        });


const url = "http://127.0.0.1:8000/local"

const datos = ""
async function Datuak() {
    try{
        const respuesta = await fetch(url);

        if(!respuesta.ok) {
      throw new Error(`Error en la petición: ${respuesta.status}`);
    }
    datos = await respuesta.json();

    } catch(error){
        console.error('Hubo un problema con la petición Fetch:', error);
    }
}
    

    

const estado = document.getElementById("estado");


// pasarle el numero de powerbanks del local
function numeroEstado(numero){


            if(numero === 0){
                circulo.classList.toggle('bg-danger');
                estado.innerHTML = "No hay ninguna disponible";
            } else{
                circulo.classList.toggle('bg-success');
                estado.innerHTML = "Estado:" + numero;
            }
        }


const mapa = document.getElementById("maps");


// pasarle el link del maps 
function linkMaps(link){
        mapa.href = link;
}

const titulo = document.getElementById("titulo");

//titulo del local
function cambiarTitutlo(texto){
    titulo.innerHTML = texto;
}

const imagen1 = document.getElementById("imagen1");
const imagen2 = document.getElementById("imagen2");
const imagen3 = document.getElementById("imagen3");

// pasar link de las imagenes
function cambiarImagenes(ruta1, ruta2, ruta3){
    imagen1.src = ruta1;
    imagen2.src = ruta2;
    imagen3.src = ruta3;
}