from pwdlib import PasswordHash
from database import get_session
from sqlalchemy.orm import Session
from models.models import AuthSession, Erabiltzailea

password_hash = PasswordHash.recommended()

def hash_password(login_pasahitza: str) -> str:
    return password_hash.hash(login_pasahitza)