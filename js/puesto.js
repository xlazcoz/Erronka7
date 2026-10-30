const circulo = document.getElementById('mi-circulo');
        circulo.addEventListener('click', () => {
            circulo.classList.toggle('bg-danger');
            circulo.classList.toggle('bg-success');
        });

    

const estado = document.getElementById("estado");

// si hay 0 pone el circulo en rojo y si hay mas pone el circulo en verde y estado: el numero

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

function linkMaps(link){
        mapa.href = link;
}

const titulo = document.getElementById("titulo");

function cambiarTitutlo(texto){
    titulo.innerHTML = texto;
}

const imagen1 = document.getElementById("imagen1");
const imagen2 = document.getElementById("imagen2");
const imagen3 = document.getElementById("imagen3");


function cambiarImagenes(ruta1, ruta2, ruta3){
    imagen1.src = ruta1;
    imagen2.src = ruta2;
    imagen3.src = ruta3;
}