let dialogQueue = [];
let currentDialog = null;
let appDialog = null;

function getAppDialog() {
  if (appDialog) return appDialog;

  appDialog = document.createElement("dialog");
  appDialog.className = "dialogo";
  appDialog.setAttribute("aria-labelledby", "dialogoTitulo");
  appDialog.innerHTML = `
        <div class="dialogo-contenido">
            <h2 class="dialogo-titulo" id="dialogoTitulo"></h2>
            <p class="dialogo-mensaje" id="dialogoMensaje"></p>
            <div class="dialogo-acciones">
                <button class="dialogo-btn dialogo-btn-cancelar" type="button">Itzuli</button>
                <button class="dialogo-btn dialogo-btn-confirmar" type="button">Onartu</button>
            </div>
        </div>
    `;
  document.body.appendChild(appDialog);

  appDialog.querySelector(".dialogo-btn-confirmar").addEventListener("click", () => {
    appDialog.close("confirm");
  });
  appDialog.querySelector(".dialogo-btn-cancelar").addEventListener("click", () => {
    appDialog.close("cancel");
  });
  appDialog.addEventListener("click", (event) => {
    if (event.target === appDialog) appDialog.close("cancel");
  });
  appDialog.addEventListener("close", () => {
    if (currentDialog) currentDialog.resolve(appDialog.returnValue === "confirm");
    currentDialog = null;
    abrirSiguienteDialogo();
  });

  return appDialog;
}

function abrirSiguienteDialogo() {
  if (currentDialog || dialogQueue.length === 0) return;

  currentDialog = dialogQueue.shift();
  const dialog = getAppDialog();
  const confirmation = currentDialog.confirmation;
  dialog.classList.toggle("dialogo-error", currentDialog.type === "error");
  dialog.classList.toggle("dialogo-exito", currentDialog.type === "success");
  dialog.querySelector("#dialogoTitulo").textContent = currentDialog.title;
  dialog.querySelector("#dialogoMensaje").textContent = currentDialog.message;
  dialog.querySelector(".dialogo-btn-cancelar").hidden = !confirmation;
  dialog.querySelector(".dialogo-btn-confirmar").textContent = confirmation
    ? "Bai, jarraitu"
    : "Ulertuta";
  dialog.showModal();
}

function mostrarDialogo(message, { title = "Aviso", type = "info" } = {}) {
  return new Promise((resolve) => {
    dialogQueue.push({
      title,
      message,
      type,
      confirmation: false,
      resolve,
    });
    abrirSiguienteDialogo();
  });
}

function confirmarDialogo(message, { title = "Confirmar" } = {}) {
  return new Promise((resolve) => {
    dialogQueue.push({
      title,
      message,
      type: "info",
      confirmation: true,
      resolve,
    });
    abrirSiguienteDialogo();
  });
}

window.mostrarDialogo = mostrarDialogo;
window.confirmarDialogo = confirmarDialogo;
