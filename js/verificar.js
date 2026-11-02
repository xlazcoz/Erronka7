//si cuando intneta entrar aqui no esta registrado redireccionar a login
// pillar el dato/token de cuando esta logeado
// esto es una simulacion porque todavia no tengo el login 
const token = ""

if(!token){
    window.location.href = "login.html";
}