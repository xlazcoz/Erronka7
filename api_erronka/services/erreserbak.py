import math
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from models.models import Erreserba, Kargagunea, KargaPostua, Powerbank
from schemas.schemas import ErreserbakResponse

# Negozioaren ordu-eremua. Erreserbak Madrid-eko ordu-eremuaren arabera
# gordetzen dira, zerbitzariaren TZ konfigurazioa edozein dela ere.
BUSINESS_TZ = ZoneInfo("Europe/Madrid")

# Negozio-arauak:
# - Erreserba egun berean hasi behar da (gaur).
# - Gehienez 6 ordu aurretik egin daiteke erreserba.
# - Gutxieneko iraupena 15 minutu, gehienez 6 ordu.
MAX_ADVANCE = timedelta(hours=6)
MAX_DURATION = timedelta(hours=6)
MIN_DURATION = timedelta(minutes=15)
PAST_TOLERANCE = timedelta(minutes=1)

# Atzerapenagatiko karga: 5 euro hasitako ordu bakoitzeko.
LATE_FEE_PER_HOUR = 5.0


def now_local() -> datetime:
    """Erreserben orduak Madrid-eko ordu-eremuan kudeatzen dira."""
    return datetime.now(BUSINESS_TZ).replace(tzinfo=None)


def normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(BUSINESS_TZ).replace(tzinfo=None)
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
    """Recogida pendiente y fuera de plazo -> expirada (no show).

    Las reservas ya recogidas NO se finalizan aquí: siguen activas hasta que
    se devuelva la powerbank, para poder registrar el retraso y su cargo.
    """
    result = session.execute(
        update(Erreserba)
        .where(
            Erreserba.egoera == "aktiboa",
            Erreserba.egikaritze_data_ordua.is_(None),
            Erreserba.amaiera_data_ordua < now_local(),
        )
        .values(egoera="amaitua")
    )
    if result.rowcount:
        session.commit()


def reservation_station(session: Session, erreserba: Erreserba) -> Kargagunea | None:
    slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
    return session.get(Kargagunea, slot.kargagunea_id) if slot is not None else None


def calculate_late_fee(
    erreserba: Erreserba, returned_at: datetime
) -> tuple[bool, int, float]:
    """Devuelve (tarde, horas empezadas, importe) para una devolución."""
    returned_at = normalize_datetime(returned_at) or now_local()
    if returned_at <= erreserba.amaiera_data_ordua:
        return False, 0, 0.0

    late_hours = math.ceil(
        (returned_at - erreserba.amaiera_data_ordua).total_seconds() / 3600
    )
    return True, late_hours, late_hours * LATE_FEE_PER_HOUR


def pickup_reservation(
    session: Session, erreserba: Erreserba, when: datetime | None = None
) -> tuple[KargaPostua, Powerbank | None]:
    when = normalize_datetime(when) or now_local()

    if erreserba.egoera != "aktiboa":
        raise HTTPException(status_code=409, detail="Erreserba hau ez dago aktibo")
    if erreserba.egikaritze_data_ordua is not None:
        raise HTTPException(status_code=409, detail="Powerbanka jada jaso da")
    if when < erreserba.hasiera_data_ordua:
        raise HTTPException(
            status_code=400,
            detail="Erreserba hasi aurretik ezin da powerbankik jaso",
        )
    if when > erreserba.amaiera_data_ordua:
        raise HTTPException(status_code=410, detail="QR kodea iraungi da")

    erreserba.egikaritze_data_ordua = when

    start_slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
    if start_slot is not None:
        start_slot.egoera = "hutsa"

    powerbank = session.get(Powerbank, erreserba.powerbank_id)
    if powerbank is not None:
        powerbank.egoera = "erabiltzen"

    return start_slot, powerbank


def pick_return_slot(
    session: Session, erreserba: Erreserba, station_id: int
) -> KargaPostua | None:
    """Elige una taquilla vacía de la estación para devolver."""
    slots = session.scalars(
        select(KargaPostua)
        .where(
            KargaPostua.kargagunea_id == station_id,
            KargaPostua.egoera == "hutsa",
        )
        .order_by(KargaPostua.id)
    ).all()

    for slot in slots:
        other_powerbank = session.scalar(
            select(Powerbank.id)
            .where(
                Powerbank.karga_postua_id == slot.id,
                Powerbank.id != erreserba.powerbank_id,
            )
            .limit(1)
        )
        if other_powerbank is None:
            return slot

    return None


def return_reservation(
    session: Session,
    erreserba: Erreserba,
    return_slot: KargaPostua,
    when: datetime | None = None,
) -> tuple[bool, int, float]:
    when = normalize_datetime(when) or now_local()

    if erreserba.egoera != "aktiboa":
        raise HTTPException(status_code=409, detail="Erreserba hau ez dago aktibo")
    if erreserba.egikaritze_data_ordua is None:
        raise HTTPException(
            status_code=409,
            detail="Powerbanka lehenago jaso behar da",
        )
    if return_slot is None:
        raise HTTPException(status_code=404, detail="Itzultzeko taquilla ez da aurkitzen")

    late, late_hours, extra_fee = calculate_late_fee(erreserba, when)

    powerbank = session.get(Powerbank, erreserba.powerbank_id)
    if powerbank is not None:
        powerbank.karga_postua_id = return_slot.id
        powerbank.egoera = "erabilgarri"

    return_slot.egoera = "kargatuta"

    start_slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
    if start_slot is not None and start_slot.id != return_slot.id:
        powerbank_left = session.scalar(
            select(Powerbank.id)
            .where(Powerbank.karga_postua_id == start_slot.id)
            .limit(1)
        )
        if powerbank_left is None:
            start_slot.egoera = "hutsa"

    erreserba.bukaerako_karga_postua = return_slot.id
    erreserba.amaitze_data_ordua = when
    erreserba.egoera = "amaitua"
    erreserba.berandu = late
    erreserba.karga_extra = extra_fee

    return late, late_hours, extra_fee


def reservation_response(session: Session, erreserba: Erreserba) -> ErreserbakResponse:
    data = ErreserbakResponse.model_validate(erreserba)
    slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
    station = session.get(Kargagunea, slot.kargagunea_id) if slot is not None else None
    powerbank = session.get(Powerbank, erreserba.powerbank_id)

    return_slot = (
        session.get(KargaPostua, erreserba.bukaerako_karga_postua)
        if erreserba.bukaerako_karga_postua is not None
        else None
    )
    return_station = (
        session.get(Kargagunea, return_slot.kargagunea_id)
        if return_slot is not None
        else None
    )

    return data.model_copy(
        update={
            "kargagunea_id": station.id if station is not None else None,
            "kargagunea_izena": station.izena if station is not None else None,
            "karga_postua_izena": f"Postua #{slot.id}" if slot is not None else None,
            "bukaerako_kargagunea_izena": (
                return_station.izena if return_station is not None else None
            ),
            "bukaerako_karga_postua_izena": (
                f"Postua #{return_slot.id}" if return_slot is not None else None
            ),
            "powerbank_karga_maila": powerbank.karga_maila if powerbank is not None else None,
        }
    )
