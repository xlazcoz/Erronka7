import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Powerbank, Udalerria
from schemas.schemas import (
    KargaguneaCreate,
    KargaguneaIrudiaUpdate,
    KargaguneaResponse,
    KargaguneaUpdate,
    KargaPostuaResponse,
)
from services.auth import (
    get_optional_current_user,
    is_municipal_admin,
    is_superadmin,
    require_admin,
)

router = APIRouter(prefix="/kargaguneak", tags=["Kargaguneak"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

SessionDep = Annotated[Session, Depends(get_session)]

def station_response(session: Session, station: Kargagunea) -> dict:
    available_count = 0
    if (station.egoera or "").lower() == "erabilgarri":
        available_count = session.scalar(
            select(func.count(Powerbank.id))
            .join(KargaPostua, Powerbank.karga_postua_id == KargaPostua.id)
            .where(
                KargaPostua.kargagunea_id == station.id,
                KargaPostua.egoera == "kargatuta",
                ~Powerbank.erreserbak.any(Erreserba.egoera == "aktiboa"),
            )
        ) or 0
    return {
        "id": station.id,
        "izena": station.izena,
        "helbidea": station.helbidea,
        "irudia1": station.irudia1,
        "irudia2": station.irudia2,
        "irudia3": station.irudia3,
        "egoera": station.egoera,
        "udalerria_id": station.udalerria_id,
        "latitude": station.latitude,
        "longitude": station.longitude,
        "libres": available_count,
        "karga_postuak": station.karga_postuak,
    }


def udalerria_balidatu(session: Session, udalerria_id: int) -> Udalerria:
    udalerria = session.get(Udalerria, udalerria_id)
    if udalerria is None:
        raise HTTPException(status_code=404, detail="Udalerria ez da aurkitzen")
    return udalerria


def egiaztatu_kargagunea_baimena(current_user: Erabiltzailea, kargagunea: Kargagunea) -> None:
    if is_superadmin(current_user):
        return

    if is_municipal_admin(current_user) and kargagunea.udalerria_id == current_user.udalerria_id:
        return

    raise HTTPException(
        status_code=403,
        detail="Beste udalerri bateko kargaguneak ezin dituzu kudeatu",
    )


@router.get("", response_model=list[KargaguneaResponse], status_code=200)
def get_kargaguneak(
    session: SessionDep,
    udalerria_id: int | None = None,
    current_user: Erabiltzailea | None = Depends(get_optional_current_user),
):
    stmt = select(Kargagunea).order_by(Kargagunea.id)

    if current_user and is_municipal_admin(current_user):
        if current_user.udalerria_id is None:
            return []
        if udalerria_id is not None and udalerria_id != current_user.udalerria_id:
            raise HTTPException(
                status_code=403,
                detail="Beste udalerri bateko kargaguneak ezin dituzu ikusi",
            )
        stmt = stmt.where(Kargagunea.udalerria_id == current_user.udalerria_id)
    elif current_user and is_superadmin(current_user):
        if udalerria_id is not None:
            stmt = stmt.where(Kargagunea.udalerria_id == udalerria_id)
    else:
        stmt = stmt.join(Udalerria, Udalerria.id == Kargagunea.udalerria_id).where(
            Udalerria.aktiboa.is_(True)
        )
        if udalerria_id is not None:
            stmt = stmt.where(Kargagunea.udalerria_id == udalerria_id)

    return [station_response(session, station) for station in session.scalars(stmt).all()]

@router.get("/{id}", response_model=KargaguneaResponse, status_code=200)
def get_kargaguneak_id(session: SessionDep, id: int):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")
    return station_response(session, kargagunea)

@router.get("/{id}/erabilgarritasuna", response_model=list[KargaPostuaResponse], status_code=200)
def kargagune_erabilgarritasuna(
    session: SessionDep,
    id: int,
    hasiera_data_ordua: datetime,
    amaiera_data_ordua: datetime,
):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if amaiera_data_ordua <= hasiera_data_ordua:
        raise HTTPException(
            status_code=400,
            detail="Amaiera-data hasiera-data baino geroagokoa izan behar da",
        )

    if (kargagunea.egoera or "").lower() != "erabilgarri":
        return []

    stmt = (
        select(KargaPostua)
        .join(Powerbank, Powerbank.karga_postua_id == KargaPostua.id)
        .where(
            KargaPostua.kargagunea_id == id,
            KargaPostua.egoera == "kargatuta",
            ~select(Erreserba.id)
            .where(
                Erreserba.hasierako_karga_postua == KargaPostua.id,
                Erreserba.egoera == "aktiboa",
                Erreserba.hasiera_data_ordua < amaiera_data_ordua,
                Erreserba.amaiera_data_ordua > hasiera_data_ordua,
            )
            .exists(),
        )
        .distinct()
        .order_by(KargaPostua.id)
    )
    return session.scalars(stmt).all()


@router.post("", response_model=KargaguneaResponse, status_code=201)
def sortu_kargagunea(
    session: SessionDep,
    data: KargaguneaCreate,
    current_user: Erabiltzailea = Depends(require_admin),
):
    udalerria_id = data.udalerria_id

    if is_municipal_admin(current_user):
        if current_user.udalerria_id is None:
            raise HTTPException(
                status_code=403,
                detail="Administratzaileari udalerri bat esleitu behar zaio",
            )
        if udalerria_id != current_user.udalerria_id:
            raise HTTPException(
                status_code=403,
                detail="Beste udalerri bateko kargaguneak ezin dituzu sortu",
            )
        udalerria_id = current_user.udalerria_id

    udalerria_balidatu(session, udalerria_id)

    kargagunea = Kargagunea(
        izena=data.izena, 
        helbidea=data.helbidea, 
        irudia1=data.irudia1, 
        irudia2=data.irudia2,
        irudia3=data.irudia3, 
        egoera=data.egoera,
        udalerria_id=udalerria_id,
        latitude=data.latitude,
        longitude=data.longitude,
    )
    session.add(kargagunea)
    session.commit()
    session.refresh(kargagunea)
    return station_response(session, kargagunea)

@router.patch("/{id}", response_model=KargaguneaResponse, status_code=200)
def aldatu_kargagunea(
    session: SessionDep,
    data: KargaguneaUpdate,
    id: int,
    current_user: Erabiltzailea = Depends(require_admin),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    egiaztatu_kargagunea_baimena(current_user, kargagunea)

    changes = data.model_dump(exclude_unset=True)

    new_udalerria_id = changes.get("udalerria_id")
    if new_udalerria_id is not None:
        if is_municipal_admin(current_user) and new_udalerria_id != kargagunea.udalerria_id:
            raise HTTPException(
                status_code=403,
                detail="Ezin duzu kargagunea beste udalerri batera aldatu",
            )
        udalerria_balidatu(session, new_udalerria_id)

    for field, value in changes.items():
        setattr(kargagunea, field, value)

    session.commit()
    session.refresh(kargagunea)
    return station_response(session, kargagunea)

@router.patch("/{id}/irudia", response_model=KargaguneaResponse, status_code=200)
def aldatu_irudia(
    session: SessionDep,
    data: KargaguneaIrudiaUpdate,
    id: int,
    current_user: Erabiltzailea = Depends(require_admin),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    egiaztatu_kargagunea_baimena(current_user, kargagunea)

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(kargagunea, field, value)

    session.commit()
    session.refresh(kargagunea)
    return station_response(session, kargagunea)

@router.post("/{id}/irudia/upload", status_code=200)
def igo_kargagunearen_irudia(
    session: SessionDep,
    request: Request,
    id: int,
    file: UploadFile = File(...),
    current_user: Erabiltzailea = Depends(require_admin),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    egiaztatu_kargagunea_baimena(current_user, kargagunea)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Fitxategiak irudi bat izan behar du")

    suffix = Path(file.filename or "").suffix.lower() or ".img"
    filename = f"{uuid.uuid4().hex}{suffix}"
    destination = UPLOAD_DIR / filename
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url = f"{str(request.base_url).rstrip('/')}/uploads/{filename}"
    return {"irudia": url}


@router.delete("/{id}", response_model=KargaguneaResponse, status_code=200)
def ezabatu_kargagunea(
    session: SessionDep,
    id: int,
    current_user: Erabiltzailea = Depends(require_admin),
):
    kargagunea = session.get(Kargagunea, id)

    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    egiaztatu_kargagunea_baimena(current_user, kargagunea)

    if kargagunea.karga_postuak:
        raise HTTPException(
            status_code=409,
            detail=(
                "Kargagune honek karga postuak ditu. Ezin da ezabatu; "
                "jarri 'Zerbitzutik kanpo' egoeran desaktibatzeko."
            ),
        )

    session.delete(kargagunea)
    session.commit()
    return kargagunea