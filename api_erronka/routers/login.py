from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from config import COOKIE_SECURE, SESSION_MAX_AGE_SECONDS
from database import get_session
from models.models import AuthSession, Erabiltzailea, Erreserba
from schemas.schemas import (
    ErabiltzaileaResponse,
    LoginRequest,
    PasswordChange,
    ProfileUpdate,
    RegisterRequest,
)
from services.auth import (
    create_session_id,
    get_current_user,
    hash_password,
    pasahitza_egiaztatu,
)
from services.erreserbak import expire_stale_reservations, reservation_response
from services.rate_limit import ip_rate_limiter, login_rate_limiter

router = APIRouter(prefix="/login", tags=["Login"])


def _client_ip(request: Request) -> str:
    """IP erreala lortu proxy baten atzetik (nginx/LB)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"

SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS


def user_response(session: Session, erabiltzailea: Erabiltzailea) -> ErabiltzaileaResponse:
    expire_stale_reservations(session)
    erreserbak = session.scalars(
        select(Erreserba)
        .where(Erreserba.erabiltzailea_id == erabiltzailea.id)
        .order_by(Erreserba.hasiera_data_ordua.desc())
    ).all()

    return ErabiltzaileaResponse(
        id=erabiltzailea.id,
        izena=erabiltzailea.izena,
        abizena=erabiltzailea.abizena or "",
        login_email=erabiltzailea.login_email,
        rola=erabiltzailea.rola,
        aktiboa=erabiltzailea.aktiboa,
        udalerria_id=erabiltzailea.udalerria_id,
        udalerria_izena=erabiltzailea.udalerria.izena if erabiltzailea.udalerria else None,
        erreserbak=[reservation_response(session, erreserba) for erreserba in erreserbak],
    )


@router.post("/register", response_model=ErabiltzaileaResponse, status_code=201)
def erregistratu(data: RegisterRequest, session: Session = Depends(get_session)):
    email = str(data.login_email).strip().lower()
    existing_user = session.scalar(
        select(Erabiltzailea).where(func.lower(Erabiltzailea.login_email) == email)
    )
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Emaila existitzen da, saioa hasi behar duzu")

    erabiltzailea = Erabiltzailea(
        izena=data.izena.strip(),
        abizena=data.abizena.strip(),
        login_email=email,
        login_pasahitza=hash_password(data.login_pasahitza),
        rola="user",
    )
    session.add(erabiltzailea)
    session.commit()
    session.refresh(erabiltzailea)

    return user_response(session, erabiltzailea)


@router.post("")
def login(
    data: LoginRequest,
    response: Response,
    request: Request,
    session: Session = Depends(get_session),
):
    email = data.login_email.strip().lower()
    client_ip = _client_ip(request)
    rate_key = f"{client_ip}:{email}"
    ip_key = f"ip:{client_ip}"

    retry_after = max(
        login_rate_limiter.blocked_for(rate_key),
        ip_rate_limiter.blocked_for(ip_key),
    )
    if retry_after:
        raise HTTPException(
            status_code=429,
            detail=(
                "Saio-hasiera saiakera gehiegi egin dira. "
                "Saiatu berriro minutu batzuen buruan."
            ),
            headers={"Retry-After": str(retry_after)},
        )

    stmt = select(Erabiltzailea).where(func.lower(Erabiltzailea.login_email) == email)
    erabiltzailea = session.scalars(stmt).first()

    if erabiltzailea is None or not pasahitza_egiaztatu(
        data.login_pasahitza, erabiltzailea.login_pasahitza
    ):
        login_rate_limiter.record_failure(rate_key)
        ip_rate_limiter.record_failure(ip_key)
        raise HTTPException(status_code=401, detail="Emaila edo pasahitza ez da zuzena")

    login_rate_limiter.reset(rate_key)

    if not erabiltzailea.aktiboa:
        raise HTTPException(status_code=403, detail="Erabiltzailea desaktibatuta dago")

    session_id = create_session_id()
    auth_session = AuthSession(id=session_id, erabiltzailea=erabiltzailea)

    session.add(auth_session)
    session.commit()

    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
        max_age=SESSION_MAX_AGE,
    )

    return {
        "message": "Saioa hasi da",
        "usuario": {
            "id": erabiltzailea.id,
            "izena": erabiltzailea.izena,
            "abizena": erabiltzailea.abizena,
            "email": erabiltzailea.login_email,
            "rola": erabiltzailea.rola,
        },
    }


@router.post("/logout")
def logout(
    response: Response,
    session_id: str | None = Cookie(default=None),
    session: Session = Depends(get_session),
):
    if session_id is not None:
        auth_session = session.get(AuthSession, session_id)
        if auth_session is not None:
            session.delete(auth_session)
            session.commit()

    response.delete_cookie(key="session_id")
    return {"message": "Saioa itxi da"}


@router.get("/me", response_model=ErabiltzaileaResponse)
def me(current_user: Erabiltzailea = Depends(get_current_user), session: Session = Depends(get_session)):
    return user_response(session, current_user)


@router.patch("/me", response_model=ErabiltzaileaResponse)
def aldatu_me(
    data: ProfileUpdate,
    current_user: Erabiltzailea = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    changes = data.model_dump(exclude_unset=True)

    if "login_email" in changes:
        email = str(changes["login_email"]).strip().lower()
        existing = session.scalar(
            select(Erabiltzailea).where(
                func.lower(Erabiltzailea.login_email) == email,
                Erabiltzailea.id != current_user.id,
            )
        )
        if existing is not None:
            raise HTTPException(status_code=409, detail="Email hori erabilita dago")
        changes["login_email"] = email

    for field, value in changes.items():
        setattr(current_user, field, value)

    session.commit()
    session.refresh(current_user)
    return user_response(session, current_user)


@router.patch("/password")
def aldatu_pasahitza(
    data: PasswordChange,
    current_user: Erabiltzailea = Depends(get_current_user),
    session_id: str | None = Cookie(default=None),
    session: Session = Depends(get_session),
):
    if not pasahitza_egiaztatu(data.current_password, current_user.login_pasahitza):
        raise HTTPException(status_code=400, detail="Oraingo pasahitza ez da zuzena")

    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="Pasahitz berria ezberdina izan behar da")

    current_user.login_pasahitza = hash_password(data.new_password)

    if session_id is not None:
        session.execute(
            delete(AuthSession).where(
                AuthSession.erabiltzailea_id == current_user.id,
                AuthSession.id != session_id,
            )
        )

    session.commit()
    return {"message": "Pasahitza aldatu da"}
