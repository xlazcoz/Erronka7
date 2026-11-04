const urlParams = new URLSearchParams(window.location.search);
const posteId = urlParams.get("id");
const circulo = document.getElementById("mi-circulo");
const estado = document.getElementById("estado");
const mapa = document.getElementById("maps");
const titulo = document.getElementById("titulo");
const imagen1 = document.getElementById("imagen1");
const imagen2 = document.getElementById("imagen2");
const imagen3 = document.getElementById("imagen3");
const reservationButton = document.getElementById("reservationButton");
const reservationFeedback = document.getElementById("reservationFeedback");

const MAX_ADVANCE_MS = 6 * 60 * 60 * 1000;
const MAX_DURATION_MS = 6 * 60 * 60 * 1000;
const MIN_DURATION_MS = 15 * 60 * 1000;

let availabilityTimer = null;

function toDateInputValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toTimeInputValue(date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
}

function combineDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const value = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function showFeedback(message, type = "error") {
  reservationFeedback.textContent = message;
  reservationFeedback.className = `pb-feedback is-visible pb-feedback-${type} mb-3`;
}

function clearFeedback() {
  reservationFeedback.textContent = "";
  reservationFeedback.className = "pb-feedback mb-3";
}

function setLoading(button, loading) {
  button.disabled = loading;
  button.querySelector(".pb-spinner")?.classList.toggle("d-none", !loading);
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return date;
}

function configurePickupDefaults() {
  const now = new Date();
  const today = toDateInputValue(now);
  const pickupDate = document.getElementById("FechaReserva");
  const pickupTime = document.getElementById("horaReserva");

  pickupDate.value = today;
  pickupDate.min = today;
  pickupDate.max = today;

  const latestStart = new Date(Math.min(now.getTime() + MAX_ADVANCE_MS, endOfToday().getTime()));
  pickupTime.min = toTimeInputValue(now);
  pickupTime.max = toTimeInputValue(latestStart);

  const defaultStart = new Date(Math.min(now.getTime() + 30 * 60 * 1000, latestStart.getTime()));
  pickupTime.value = toTimeInputValue(defaultStart);

  updateReturnLimits(defaultStart);
}

function updateReturnLimits(start) {
  const returnDate = document.getElementById("FechaDevolucion");
  const returnTime = document.getElementById("HoraDevolucion");

  const minEnd = new Date(start.getTime() + MIN_DURATION_MS);
  const maxEnd = new Date(start.getTime() + MAX_DURATION_MS);

  returnDate.min = toDateInputValue(start);
  returnDate.max = toDateInputValue(maxEnd);

  const currentEnd = combineDateTime(returnDate.value, returnTime.value);
  if (!currentEnd || currentEnd <= start || currentEnd > maxEnd) {
    const defaultEnd = new Date(start.getTime() + 60 * 60 * 1000);
    returnDate.value = toDateInputValue(defaultEnd);
    returnTime.value = toTimeInputValue(defaultEnd);
  }
}

function updateSummary() {
  const start = combineDateTime(
    document.getElementById("FechaReserva").value,
    document.getElementById("horaReserva").value,
  );
  const end = combineDateTime(
    document.getElementById("FechaDevolucion").value,
    document.getElementById("HoraDevolucion").value,
  );
  const durationElement = document.getElementById("reservationDuration");
  const availabilityElement = document.getElementById("reservationAvailability");

  if (!start || !end || end <= start) {
    durationElement.textContent = "—";
    availabilityElement.textContent = "—";
    availabilityElement.classList.remove("is-free", "is-busy");
    return;
  }

  const minutes = Math.round((end - start) / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  durationElement.textContent = hours === 0 ? `${rest} min` : rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;

  scheduleAvailabilityCheck(start, end);
}

function validateReservationWindow(start, end) {
  const now = new Date();
  const today = toDateInputValue(now);

  if (toDateInputValue(start) !== today) {
    return "Solo puedes reservar para hoy. Elige la fecha de hoy.";
  }

  if (start < new Date(now.getTime() - 60 * 1000)) {
    return "La hora de recogida no puede estar en el pasado.";
  }

  if (start > new Date(now.getTime() + MAX_ADVANCE_MS)) {
    return "Solo puedes reservar con un máximo de 6 horas de antelación.";
  }

  if (end <= start) {
    return "La devolución debe ser posterior a la recogida.";
  }

  const duration = end - start;
  if (duration < MIN_DURATION_MS) {
    return "La reserva debe durar al menos 15 minutos.";
  }

  if (duration > MAX_DURATION_MS) {
    return "La reserva no puede durar más de 6 horas.";
  }

  return null;
}

async function checkAvailability(start, end) {
  const data = await apiRequest(
    `/kargaguneak/${posteId}/erreserbagarritasuna?hasiera=${encodeURIComponent(
      start.toISOString(),
    )}&amaiera=${encodeURIComponent(end.toISOString())}`,
  );
  return data;
}

function scheduleAvailabilityCheck(start, end) {
  clearTimeout(availabilityTimer);
  const availabilityElement = document.getElementById("reservationAvailability");

  if (!posteId) {
    availabilityElement.textContent = "—";
    return;
  }

  availabilityTimer = setTimeout(async () => {
    availabilityElement.textContent = "Comprobando…";
    availabilityElement.classList.remove("is-free", "is-busy");

    try {
      const data = await checkAvailability(start, end);
      if (data.libres > 0) {
        availabilityElement.textContent = `${data.libres} powerbank(s) disponible(s)`;
        availabilityElement.classList.add("is-free");
      } else {
        availabilityElement.textContent = "Sin disponibilidad en ese horario";
        availabilityElement.classList.add("is-busy");
      }
    } catch (error) {
      availabilityElement.textContent = "No se pudo comprobar";
      availabilityElement.classList.remove("is-free", "is-busy");
    }
  }, 450);
}

async function Datuak() {
  try {
    if (!posteId) {
      throw new Error("No se ha indicado una estación.");
    }

    const datos = await apiRequest(`/kargaguneak/${posteId}`);
    cambiarTitulo(datos.izena);
    numeroEstado(datos.libres, datos.egoera);
    linkMaps(datos.helbidea, datos.udalerria_izena);
    cambiarImagenes(datos.irudia1, datos.irudia2, datos.irudia3);
  } catch (error) {
    console.error("No se pudo cargar la estación:", error);
    titulo.textContent = error.message;
    estado.textContent = "";
    reservationButton.disabled = true;
  }
}

function numeroEstado(numero, estadoEstacion) {
  const operativa = (estadoEstacion || "").toLowerCase() === "erabilgarri";
  const disponibles = operativa ? numero : 0;

  circulo.classList.toggle("bg-success", disponibles > 0);
  circulo.classList.toggle("bg-danger", disponibles === 0);

  if (!operativa) {
    estado.textContent = "Estación no disponible en este momento";
  } else if (disponibles === 0) {
    estado.textContent = "No hay ninguna powerbank disponible ahora; puedes probar otro horario";
  } else {
    estado.textContent = `Disponibles ahora: ${disponibles}`;
  }

  reservationButton.disabled = !operativa;
}

function linkMaps(address, udalerria) {
  mapa.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  mapa.replaceChildren();
  const icon = document.createElement("i");
  icon.className = "fas fa-location-dot me-2";
  const text = [udalerria, address].filter(Boolean).join(" · ");
  mapa.append(icon, document.createTextNode(text));
}

function cambiarTitulo(texto) {
  titulo.textContent = texto;
}

function cambiarImagenes(ruta1, ruta2, ruta3) {
  imagen1.src = ruta1;
  imagen2.src = ruta2;
  imagen3.src = ruta3;
}

document.getElementById("FechaReserva").addEventListener("change", () => {
  const start = combineDateTime(
    document.getElementById("FechaReserva").value,
    document.getElementById("horaReserva").value,
  );
  if (start) updateReturnLimits(start);
  updateSummary();
});

document.getElementById("horaReserva").addEventListener("change", () => {
  const start = combineDateTime(
    document.getElementById("FechaReserva").value,
    document.getElementById("horaReserva").value,
  );
  if (start) updateReturnLimits(start);
  updateSummary();
});

document.getElementById("FechaDevolucion").addEventListener("change", updateSummary);
document.getElementById("HoraDevolucion").addEventListener("change", updateSummary);

document.getElementById("closeReserva").addEventListener("click", () => {
  document.getElementById("Reserva").hidePopover();
});

document.getElementById("reservationForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFeedback();

  const start = combineDateTime(
    document.getElementById("FechaReserva").value,
    document.getElementById("horaReserva").value,
  );
  const end = combineDateTime(
    document.getElementById("FechaDevolucion").value,
    document.getElementById("HoraDevolucion").value,
  );

  if (!start || !end) {
    showFeedback("Selecciona la fecha y la hora de recogida y devolución.");
    return;
  }

  const validationError = validateReservationWindow(start, end);
  if (validationError) {
    showFeedback(validationError);
    return;
  }

  const submit = document.getElementById("reservationSubmit");
  setLoading(submit, true);

  try {
    const availability = await checkAvailability(start, end);
    if (!availability.erabilgarri) {
      showFeedback("No hay ninguna powerbank disponible en ese horario. Prueba otro horario.");
      setLoading(submit, false);
      return;
    }

    await apiRequest("/erreserbak", {
      method: "POST",
      body: {
        kargagunea_id: Number(posteId),
        hasiera_data_ordua: start.toISOString(),
        amaiera_data_ordua: end.toISOString(),
      },
    });

    document.getElementById("Reserva").hidePopover();
    await mostrarDialogo("Reserva creada correctamente. Puedes verla en Mi cuenta.", {
      title: "Reserva confirmada",
      type: "success",
    });

    configurePickupDefaults();
    updateSummary();
    clearFeedback();
    await Datuak();
  } catch (error) {
    if (error.status === 401) {
      await mostrarDialogo("Inicia sesión para reservar.", {
        title: "Inicia sesión",
        type: "error",
      });
      window.location.href = `Login.html?next=${encodeURIComponent(`puesto-Carga.html?id=${posteId}`)}`;
      return;
    }

    showFeedback(error.message || "No se pudo crear la reserva.");
  } finally {
    setLoading(submit, false);
  }
});

configurePickupDefaults();
updateSummary();
Datuak();
