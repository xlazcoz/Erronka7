from typing import Annotated
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from schemas.schemas import LoginRequest, RegisterRequest, ErabiltzaileaResponse
from models.models import AuthSession, Erabiltzailea
from services.auth import get_current_user, create_session_id, hash_password, pasahitza_egiaztatu

router = APIRouter(prefix="/login", tags=["Login"])

@router.post("/register", response_model=ErabiltzaileaResponse, status_code=201)
def erregistratu(data: RegisterRequest, session: Session = Depends(get_session)):
    erabiltzailea = Erabiltzailea(
        izena=data.izena,
        abizena="",  # abizena por defecto en registro rápido
        login_email=data.login_email,
        login_pasahitza=hash_password(data.login_pasahitza),
        rola="user"
    )
    try:
        session.add(erabiltzailea)
        session.commit()
        session.refresh(erabiltzailea)
    except Exception:
        session.rollback()
        raise HTTPException(status_code=409, detail="Emaila existitzen da, saioa hasi behar duzu")

    return erabiltzailea

@router.post("")
def login(data: LoginRequest, response: Response, session: Session = Depends(get_session)):
    stmt = select(Erabiltzailea).where(Erabiltzailea.login_email == data.login_email)
    erabiltzailea = session.scalars(stmt).first()

    # Corregido: usa login_pasahitza de tu modelo de SQLAlchemy
    if erabiltzailea is None or not pasahitza_egiaztatu(data.login_pasahitza, erabiltzailea.login_pasahitza):
        raise HTTPException(status_code=401, detail="Emaila edo pasahitza ez da zuzena")

    session_id = create_session_id()

    # Corregido: se asigna a la relación erabiltzailea
    auth_session = AuthSession(id=session_id, erabiltzailea=erabiltzailea)

    session.add(auth_session)
    session.commit()

    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite="lax", secure=False)

    return {"message": "Saioa hasi da"}

@router.post("/logout")
def logout(response: Response, session_id: str | None = Cookie(default=None), session: Session = Depends(get_session)):
    if session_id is not None: 
        auth_session = session.get(AuthSession, session_id)
        if auth_session is not None:
            session.delete(auth_session)
            session.commit()

    response.delete_cookie(key="session_id")
    return {"message": "Saioa itxi da"}

@router.get("/me", response_model=ErabiltzaileaResponse)
def me(current_user: Erabiltzailea = Depends(get_current_user)):
    return current_user