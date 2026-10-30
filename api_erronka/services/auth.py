from typing import Annotated

from fastapi import Cookie, Depends, HTTPException

from pwdlib import PasswordHash
from database import get_session
from sqlalchemy.orm import Session
from models.models import AuthSession, Erabiltzailea
import secrets


password_hash = PasswordHash.recommended()

def hash_password(login_pasahitza: str) -> str:
    return password_hash.hash(login_pasahitza)

def pasahitza_egiaztatu(pasahitza_normal: str, hashed_pasahitza: str) -> bool:
    return password_hash.verify(pasahitza_normal, hashed_pasahitza)

def create_session_id() -> str:
    return secrets.token_urlsafe(32)

def get_current_user(session_id: str | None = Cookie(default=None), session: Session = Depends(get_session)) -> Erabiltzailea:
    if session_id is None:
        raise HTTPException(status_code=401, detail="Saioa hasi behar duzu")
    
    auth_session = session.get(AuthSession, session_id)
    if auth_session is None:
        raise HTTPException(status_code=401)

    return auth_session.erabiltzailea

def require_admin(current_user: Erabiltzailea = Depends(get_current_user)) -> Erabiltzailea:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Ez zara administratzailea",)

    return current_user