const loginContainer = document.getElementById("Login");
const registroContainer = document.getElementById("Registrarse");
const authMessage = document.getElementById("authMessage");

function registrar() {
    registroContainer.style.display = "block";
    loginContainer.style.display = "none";
    authMessage.textContent = "";
    authMessage.className = "container mt-3";
}

function iniciarSesion() {
    loginContainer.style.display = "block";
    registroContainer.style.display = "none";
    authMessage.textContent = "";
    authMessage.className = "container mt-3";
}

function mostrarErrorAuth(message) {
    authMessage.textContent = message;
    authMessage.className = "alert alert-danger container mt-3";
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage.textContent = "";
    authMessage.className = "container mt-3";

    try {
        await apiRequest("/login", {
            method: "POST",
            body: {
                login_email: document.getElementById("Email").value.trim(),
                login_pasahitza: document.getElementById("loginPassword").value,
            },
        });
        window.location.href = "index.html";
    } catch (error) {
        mostrarErrorAuth(error.message);
    }
});

document.getElementById("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage.textContent = "";
    authMessage.className = "container mt-3";

    const password = document.getElementById("registerPassword").value;
    const repeatedPassword = document.getElementById("repeatPassword").value;
    if (password !== repeatedPassword) {
        mostrarErrorAuth("Las contraseñas no coinciden.");
        return;
    }

    const credentials = {
        login_email: document.getElementById("Email2").value.trim(),
        login_pasahitza: password,
    };

    try {
        await apiRequest("/login/register", {
            method: "POST",
            body: {
                izena: document.getElementById("registerName").value.trim(),
                ...credentials,
            },
        });
        await apiRequest("/login", { method: "POST", body: credentials });
        window.location.href = "index.html";
    } catch (error) {
        mostrarErrorAuth(error.message);
    }
});
