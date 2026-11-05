import shutil
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Powerbank, Udalerria
from schemas.schemas import KargaguneaCreate, KargaguneaResponse, KargaguneaUpdate, KargaguneaIrudiaUpdate
from services.auth import can_manage_municipality, get_optional_user, require_manager
from services.erreserbak import normalize_datetime, now_local

router = APIRouter(prefix="/kargaguneak", tags=["Kargaguneak"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

SessionDep = Annotated[Session, Depends(get_session)]


def _municipality_is_active(station: Kargagunea) -> bool:
    return station.udalerria is None or station.udalerria.aktiboa


def free_powerbanks_query(station_id: int, start: datetime, end: datetime):
    overlapping = (
        select(Erreserba.id)
        .where(
            Erreserba.powerbank_id == Powerbank.id,
            Erreserba.egoera == "aktiboa",
            Erreserba.hasiera_data_ordua < end,
            Erreserba.amaiera_data_ordua > start,
        )
        .exists()
    )
    return (
        select(func.count(Powerbank.id))
        .join(KargaPostua, Powerbank.karga_postua_id == KargaPostua.id)
        .where(
            KargaPostua.kargagunea_id == station_id,
            KargaPostua.egoera == "kargatuta",
            Powerbank.egoera == "erabilgarri",
            ~overlapping,
        )
    )


def station_response(session: Session, station: Kargagunea) -> dict:
    available_count = 0
    if station.egoera.lower() == "erabilgarri":
        now = now_local()
        available_count = session.scalar(free_powerbanks_query(station.id, now, now)) or 0
    return {
        "id": station.id,
        "izena": station.izena,
        "helbidea": station.helbidea,
        "irudia1": station.irudia1,
        "irudia2": station.irudia2,
        "irudia3": station.irudia3,
        "egoera": station.egoera,
        "udalerria_id": station.udalerria_id,
        "udalerria_izena": station.udalerria.izena if station.udalerria is not None else None,
        "latitud": station.latitud,
        "longitud": station.longitud,
        "libres": available_count,
        "karga_postuak": station.karga_postuak,
    }

@router.get("", response_model=list[KargaguneaResponse], status_code=200)
def get_kargaguneak(
    session: SessionDep,
    udalerria_id: int | None = None,
    include_inactive: bool = False,
    current_user: Erabiltzailea | None = Depends(get_optional_user),
):
    if include_inactive and (
        current_user is None or current_user.rola not in {"admin", "udalerri_admin"}
    ):
        raise HTTPException(
            status_code=403,
            detail="Ez duzu udalerri desaktibatuetako kargaguneak ikusteko baimenik",
        )

    stmt = select(Kargagunea).order_by(Kargagunea.id)

    if not include_inactive:
        stmt = stmt.outerjoin(
            Udalerria, Kargagunea.udalerria_id == Udalerria.id
        ).where(
            or_(Kargagunea.udalerria_id.is_(None), Udalerria.aktiboa.is_(True))
        )

    if udalerria_id is not None:
        stmt = stmt.where(Kargagunea.udalerria_id == udalerria_id)

    return [station_response(session, station) for station in session.scalars(stmt).all()]

@router.get("/{id}", response_model=KargaguneaResponse, status_code=200)
def get_kargaguneak_id(
    session: SessionDep,
    id: int,
    current_user: Erabiltzailea | None = Depends(get_optional_user),
):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if not _municipality_is_active(kargagunea) and (
        current_user is None or current_user.rola not in {"admin", "udalerri_admin"}
    ):
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    return station_response(session, kargagunea)

@router.get("/{id}/erreserbagarritasuna", status_code=200)
def kargagunearen_erreserbagarritasuna(
    session: SessionDep,
    id: int,
    hasiera: datetime = Query(...),
    amaiera: datetime = Query(...),
):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    hasiera = normalize_datetime(hasiera)
    amaiera = normalize_datetime(amaiera)
    if hasiera is None or amaiera is None or amaiera <= hasiera:
        raise HTTPException(status_code=400, detail="Ordutegi-tarteak ez du balio")
    if amaiera - hasiera > timedelta(hours=6):
        raise HTTPException(status_code=400, detail="Erreserbak gehienez 6 ordu iraun dezake")

    if kargagunea.egoera.lower() != "erabilgarri" or not _municipality_is_active(kargagunea):
        return {"libres": 0, "erabilgarri": False}

    libres = session.scalar(free_powerbanks_query(id, hasiera, amaiera)) or 0
    return {"libres": libres, "erabilgarri": libres > 0}

@router.post("", response_model=KargaguneaResponse, status_code=201)
def sortu_kargagunea(
    session: SessionDep,
    data: KargaguneaCreate,
    current_user: Erabiltzailea = Depends(require_manager),
):
    udalerria_id = data.udalerria_id
    if current_user.rola == "udalerri_admin":
        udalerria_id = current_user.udalerria_id
        if udalerria_id is None:
            raise HTTPException(status_code=403, detail="Ez duzu udalerri bat esleituta")

    udalerria = session.get(Udalerria, udalerria_id) if udalerria_id is not None else None
    if udalerria_id is not None and udalerria is None:
        raise HTTPException(status_code=404, detail="Udalerria ez da aurkitzen")
    if udalerria is not None and not udalerria.aktiboa:
        raise HTTPException(
            status_code=409,
            detail="Udalerria desaktibatuta dago; ezin da kargagunerik sortu",
        )

    kargagunea = Kargagunea(
        izena=data.izena, 
        helbidea=data.helbidea, 
        irudia1=data.irudia1, 
        irudia2=data.irudia2,
        irudia3=data.irudia3, 
        egoera=data.egoera,
        udalerria_id=udalerria_id,
        latitud=data.latitud,
        longitud=data.longitud,
    )
    session.add(kargagunea)
    session.commit()
    session.refresh(kargagunea)
    return kargagunea

@router.patch("/{id}", response_model=KargaguneaResponse, status_code=200)
def aldatu_kargagunea(
    session: SessionDep,
    data: KargaguneaUpdate,
    id: int,
    current_user: Erabiltzailea = Depends(require_manager),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if not can_manage_municipality(current_user, kargagunea.udalerria_id):
        raise HTTPException(status_code=403, detail="Ez duzu kargagune hau aldatzeko baimenik")

    changes = data.model_dump(exclude_unset=True)
    if current_user.rola == "udalerri_admin":
        changes["udalerria_id"] = current_user.udalerria_id

    if "udalerria_id" in changes:
        udalerria_id = changes["udalerria_id"]
        udalerria = session.get(Udalerria, udalerria_id) if udalerria_id is not None else None
        if udalerria_id is not None and udalerria is None:
            raise HTTPException(status_code=404, detail="Udalerria ez da aurkitzen")
        if udalerria is not None and not udalerria.aktiboa:
            raise HTTPException(
                status_code=409,
                detail="Udalerria desaktibatuta dago; ezin da kargagunea bertara mugitu",
            )

    for field, value in changes.items():
        setattr(kargagunea, field, value)

    session.commit()
    session.refresh(kargagunea)
    return kargagunea

@router.patch("/{id}/irudia", response_model=KargaguneaResponse, status_code=200)
def aldatu_irudia(
    session: SessionDep,
    data: KargaguneaIrudiaUpdate,
    id: int,
    current_user: Erabiltzailea = Depends(require_manager),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if not can_manage_municipality(current_user, kargagunea.udalerria_id):
        raise HTTPException(status_code=403, detail="Ez duzu kargagune hau aldatzeko baimenik")

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(kargagunea, field, value)

    session.commit()
    session.refresh(kargagunea)
    return kargagunea


@router.post("/{id}/irudia/upload", status_code=200)
def igo_kargagunearen_irudia(
    session: SessionDep,
    request: Request,
    id: int,
    file: UploadFile = File(...),
    current_user: Erabiltzailea = Depends(require_manager),
):
    kargagunea = session.get(Kargagunea, id)
    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if not can_manage_municipality(current_user, kargagunea.udalerria_id):
        raise HTTPException(status_code=403, detail="Ez duzu kargagune hau aldatzeko baimenik")

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
    current_user: Erabiltzailea = Depends(require_manager),
):
    kargagunea = session.get(Kargagunea, id)

    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    if not can_manage_municipality(current_user, kargagunea.udalerria_id):
        raise HTTPException(status_code=403, detail="Ez duzu kargagune hau ezabatzeko baimenik")

    # Datuen osotasuna: erreserbak edo postuak baditu, ez da ezabatu behar.
    if kargagunea.karga_postuak:
        raise HTTPException(
            status_code=409,
            detail="Kargaguneak karga-postuak ditu; desaktibatu edo ezabatu lehenago",
        )

    session.delete(kargagunea)
    session.commit()
    return kargagunea