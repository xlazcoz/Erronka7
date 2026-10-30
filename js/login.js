const loginContainer = document.getElementById("Login");
    const registroContainer = document.getElementById("Registrarse");

    function registrar() {
      registroContainer.style.display = "block";
      loginContainer.style.display = "none";
    }

    function iniciarSesion() {
      loginContainer.style.display = "block";
      registroContainer.style.display = "none";
    }



    // comprobar si existen las credenciales en la base de datos
    const usuario = document.getElementById("user")
    const pass = document.getElementById("Contraseña")
    // pillar datos de la api



