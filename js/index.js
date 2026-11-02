const lista = document.getElementById("lista");

document.addEventListener("DOMContentLoaded", Datuak);

async function Datuak() {
    try {
        const datos = await apiRequest("/kargaguneak");
        renderizarLista(datos);

    } catch (error) {
        console.error("No se pudieron cargar las estaciones:", error);
        lista.textContent = `No se pudieron cargar las estaciones: ${error.message}`;
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
        
        const disponibles = poste.libres || 0;
        
        const estadoColor = disponibles > 0 && poste.egoera === "erabilgarri" ? "success" : "danger";

        const div = document.createElement("div");
        div.className = `bg-${estadoColor} rounded-circle shadow-sm`;
        div.style.cssText = "width: 25px; height: 25px;";

        a.appendChild(span);
        a.appendChild(div);
        lista.appendChild(a);
    });
    
}