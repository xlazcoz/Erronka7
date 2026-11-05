from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erabiltzailea, Erreserba, KargaPostua, Kargagunea
from schemas.schemas import QrScanRequest
from services.auth import require_admin
from services.erreserbak import (
    expire_stale_reservations,
    now_local,
    pick_return_slot,
    pickup_reservation,
    reservation_response,
    return_reservation,
)

router = APIRouter(prefix="/qr", tags=["QR"])

SessionDep = Annotated[Session, Depends(get_session)]


def _reservation_json(session: Session, erreserba: Erreserba) -> dict:
    return reservation_response(session, erreserba).model_dump(mode="json")


def _station_json(station: Kargagunea) -> dict:
    return {"id": station.id, "izena": station.izena}


def _reply(status_code: int, status: str, message: str, **extra) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"status": status, "message": message, **extra},
    )


@router.post("/eskaneatu")
def eskaneatu(
    data: QrScanRequest,
    session: SessionDep,
    _admin: Erabiltzailea = Depends(require_admin),
):
    """La taquilla (admin) lee el QR de una reserva.

    Primera lectura: recogida. Segunda lectura: devolución en la estación
    desde la que se escanea.
    """
    expire_stale_reservations(session)

    erreserba = session.scalar(
        select(Erreserba).where(Erreserba.qr_token == data.token)
    )
    if erreserba is None:
        return _reply(
            404,
            "invalid",
            "QR baliogabea. Ez dator bat erreserba batekin.",
        )

    station = session.get(Kargagunea, data.kargagunea_id)
    if station is None:
        return _reply(
            404,
            "invalid_station",
            "Taquilla honen kargagunea ez da existitzen.",
        )

    reservation = _reservation_json(session, erreserba)
    station_label = f"Kargagunea {station.id} · {station.izena}"

    start_slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
    start_station = (
        session.get(Kargagunea, start_slot.kargagunea_id)
        if start_slot is not None
        else None
    )
    now = now_local()

    if erreserba.egoera == "ezeztatua":
        return _reply(
            409,
            "cancelled",
            "Erreserba hau ezeztatuta dago.",
            reservation=reservation,
            station=_station_json(station),
        )

    if erreserba.egoera == "amaitua":
        if erreserba.egikaritze_data_ordua is None:
            return _reply(
                410,
                "expired",
                "QR iraungita: erreserba ez zen garaiz jaso.",
                reservation=reservation,
                station=_station_json(station),
            )
        return _reply(
            200,
            "already_returned",
            "Powerbank hau dagoeneko itzuli da.",
            reservation=reservation,
            station=_station_json(station),
        )

    # Primera lectura: todavía no se ha recogido.
    if erreserba.egikaritze_data_ordua is None:
        if now < erreserba.hasiera_data_ordua:
            return _reply(
                409,
                "too_early",
                (
                    "Oraindik ez da ordua. Zure erreserba "
                    f"{erreserba.hasiera_data_ordua:%H:%M}-etan hasten da."
                ),
                reservation=reservation,
                station=_station_json(station),
                starts_at=erreserba.hasiera_data_ordua.isoformat(),
            )

        if now > erreserba.amaiera_data_ordua:
            erreserba.egoera = "amaitua"
            session.commit()
            return _reply(
                410,
                "expired",
                (
                    "QR iraungita: erreserba "
                    f"{erreserba.amaiera_data_ordua:%H:%M}-etan amaitu zen."
                ),
                reservation=_reservation_json(session, erreserba),
                station=_station_json(station),
                ended_at=erreserba.amaiera_data_ordua.isoformat(),
            )

        if start_station is None or start_station.id != station.id:
            return _reply(
                409,
                "wrong_station",
                (
                    f"Erreserba {start_station.izena if start_station else 'beste kargagune bat'}"
                    " kargagunekoa da. Eskaneatu QR kodea kargagune horretan jasotzeko."
                ),
                reservation=reservation,
                station=_station_json(station),
                expected_station=(
                    _station_json(start_station) if start_station is not None else None
                ),
            )

        locker, _powerbank = pickup_reservation(session, erreserba, now)
        session.commit()
        return _reply(
            200,
            "in_use",
            (
                f"Taquilla #{locker.id} irekita. "
                f"Hartu #{erreserba.powerbank_id} powerbanka eta itxi taquilla."
            ),
            reservation=_reservation_json(session, erreserba),
            station=_station_json(station),
            locker_id=locker.id,
            powerbank_id=erreserba.powerbank_id,
            pickup_at=erreserba.egikaritze_data_ordua.isoformat(),
        )

    # Segunda lectura: devolución en la estación escaneada.
    return_slot = pick_return_slot(session, erreserba, station.id)
    if return_slot is None:
        return _reply(
            409,
            "no_free_locker",
            (
                f"Ez dago taquilla librerik {station_label} kargagunean. "
                "Probatu beste kargagune bat."
            ),
            reservation=reservation,
            station=_station_json(station),
        )

    late, late_hours, extra_fee = return_reservation(
        session, erreserba, return_slot, now
    )
    session.commit()

    if late:
        extra_fee_txt = f"{extra_fee:.2f}".replace(".", ",")
        return _reply(
            200,
            "returned_late",
            (
                f"Powerbank {station_label} kargagunean berandu emanda. "
                "Gastu gehigarria: "
                f"{extra_fee_txt} € ({late_hours} hasitako ordu)."
            ),
            reservation=_reservation_json(session, erreserba),
            station=_station_json(station),
            locker_id=return_slot.id,
            late=True,
            late_hours=late_hours,
            extra_fee=extra_fee,
        )

    return _reply(
        200,
        "returned",
        f"Powerbank {station_label} kargagunean emanda. Eskerrik asko!",
        reservation=_reservation_json(session, erreserba),
        station=_station_json(station),
        locker_id=return_slot.id,
        late=False,
        late_hours=0,
        extra_fee=0.0,
    )
