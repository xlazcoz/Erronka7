from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session

from models.models import Erreserba, KargaPostua, Kargagunea, Powerbank
from schemas.schemas import ErreserbakResponse

# Negozio-arauak:
# - Erreserba egun berean hasi behar da (gaur).
# - Gehienez 6 ordu aurretik egin daiteke erreserba.
# - Gutxieneko iraupena 15 minutu, gehienez 6 ordu.
MAX_ADVANCE = timedelta(hours=6)
MAX_DURATION = timedelta(hours=6)
MIN_DURATION = timedelta(minutes=15)
PAST_TOLERANCE = timedelta(minutes=1)


def now_local() -> datetime:
    """Erreserben orduak modu lokalean gordetzen dira, frontendak bezala."""
    return datetime.now()


def normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone().replace(tzinfo=None)
    return value


def validate_reservation_window(start: datetime, end: datetime) -> tuple[datetime, datetime]:
    start = normalize_datetime(start)
    end = normalize_datetime(end)
    now = now_local()

    if start is None or end is None:
        raise HTTPException(status_code=400, detail="Erreserbaren datak beharrezkoak dira")

    if end <= start:
        raise HTTPException(
            status_code=400,
            detail="Amaiera-data hasiera-data baino geroagokoa izan behar da",
        )

    if start < now - PAST_TOLERANCE:
        raise HTTPException(status_code=400, detail="Ezin da iraganeko erreserbarik egin")

    if start.date() != now.date():
        raise HTTPException(
            status_code=400,
            detail="Powerbankak gaurko egunean bakarrik erreserbatu daitezke",
        )

    if start > now + MAX_ADVANCE:
        raise HTTPException(
            status_code=400,
            detail="Gehienez 6 ordu aurretik egin daiteke erreserba",
        )

    duration = end - start
    if duration < MIN_DURATION:
        raise HTTPException(
            status_code=400,
            detail="Erreserbak gutxienez 15 minutu iraun behar du",
        )

    if duration > MAX_DURATION:
        raise HTTPException(
            status_code=400,
            detail="Erreserbak gehienez 6 ordu iraun dezake",
        )

    return start, end


def expire_stale_reservations(session: Session) -> None:
    """Amaitutako erreserba aktiboak automatikoki 'amaitua' egoerara pasatzen ditu."""
    result = session.execute(
        update(Erreserba)
        .where(
            Erreserba.egoera == "aktiboa",
            Erreserba.amaiera_data_ordua < now_local(),
        )
        .values(egoera="amaitua")
    )
    if result.rowcount:
        session.commit()


def reservation_response(session: Session, erreserba: Erreserba) -> ErreserbakResponse:
    data = ErreserbakResponse.model_validate(erreserba)
    slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
    station = session.get(Kargagunea, slot.kargagunea_id) if slot is not None else None
    powerbank = session.get(Powerbank, erreserba.powerbank_id)

    return data.model_copy(
        update={
            "kargagunea_izena": station.izena if station is not None else None,
            "karga_postua_izena": f"Puesto #{slot.id}" if slot is not None else None,
            "powerbank_karga_maila": powerbank.karga_maila if powerbank is not None else None,
        }
    )
