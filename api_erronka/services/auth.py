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

    if not auth_session.erabiltzailea.aktiboa:
        raise HTTPException(status_code=403, detail="Erabiltzailea desaktibatuta dago")

    return auth_session.erabiltzailea

def require_admin(current_user: Erabiltzailea = Depends(get_current_user)) -> Erabiltzailea:
    if current_user.rola != "admin":
        raise HTTPException(
            status_code=403, detail="Ez zara administratzaile orokorra",)

    return current_user


def require_manager(current_user: Erabiltzailea = Depends(get_current_user)) -> Erabiltzailea:
    if current_user.rola not in {"admin", "udalerri_admin"}:
        raise HTTPException(
            status_code=403, detail="Ez duzu kudeatzeko baimenik",)

    return current_user


def is_general_admin(current_user: Erabiltzailea) -> bool:
    return current_user.rola == "admin"


def is_municipal_admin(current_user: Erabiltzailea) -> bool:
    return current_user.rola == "udalerri_admin" and current_user.udalerria_id is not None


def can_manage_municipality(current_user: Erabiltzailea, udalerria_id: int | None) -> bool:
    if is_general_admin(current_user):
        return True
    if is_municipal_admin(current_user):
        return udalerria_id is not None and current_user.udalerria_id == udalerria_id
    return False