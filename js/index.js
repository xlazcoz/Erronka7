const lista = document.getElementById("lista");
const url = "http://127.0.0.1:8000/kargaguneak";

let datos = []; 

document.addEventListener("DOMContentLoaded", Datuak);

async function Datuak() {
    try {
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error(`Error en la petición: ${respuesta.status}`);
        }
        
        datos = await respuesta.json();
        console.log("Datos cargados correctamente");

        renderizarLista(datos);

    } catch (error) {
        console.error('Hubo un problema con la petición Fetch:', error);
    }
}

function renderizarLista(elementos) {
    lista.innerHTML = "";

    elementos.forEach(poste => {
        const a = document.createElement("a");
         a.href = `puesto-Carga.html?id=${poste.id}`;
        a.className = "list-group-item list-group-item-action estacion-item text-white rounded-pill d-flex justify-content-between align-items-center py-3 px-4 shadow-sm mb-2";
        
        const span = document.createElement("span");
        span.className = "text-lowercase fw-medium";
        span.textContent = poste.izena;
        
        const div = document.createElement("div");
        

        
        div.className = `bg-${color} rounded-circle shadow-sm`;
        div.style.cssText = "width: 25px; height: 25px;";

        a.appendChild(span);
        a.appendChild(div);
        lista.appendChild(a);
    });
    
    console.log("Lista creada en el DOM");
}

function color(numPower) {
    if (numPower === 0 || !numPower) {
        return "danger";
    } else {
        return "success"; 
    }
}