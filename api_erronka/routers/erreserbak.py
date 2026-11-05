from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_session
from models.models import Erreserba, KargaPostua, Kargagunea, Powerbank, Erabiltzailea
from schemas.schemas import (
    ErreserbakCreate,
    ErreserbakResponse,
    ErreserbakEgoeraUpdate,
    ErreserbakItzuliUpdate,
    ErreserbakOrdutegiaUpdate,
)
from services.auth import can_manage_municipality, get_current_user, require_admin, require_manager
from services.erreserbak import (
    expire_stale_reservations,
    pickup_reservation,
    reservation_response,
    return_reservation,
    validate_reservation_window,
)

router = APIRouter(prefix="/erreserbak", tags=["Erreserbak"])

SessionDep = Annotated[Session, Depends(get_session)]
CurrentUser = Annotated[Erabiltzailea, Depends(get_current_user)]


def _reservation_station(session: Session, erreserba: Erreserba) -> Kargagunea | None:
    slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
    return session.get(Kargagunea, slot.kargagunea_id) if slot is not None else None


def _can_manage(session: Session, current_user: Erabiltzailea, erreserba: Erreserba) -> bool:
    if current_user.rola == "admin" or erreserba.erabiltzailea_id == current_user.id:
        return True

    if current_user.rola == "udalerri_admin":
        station = _reservation_station(session, erreserba)
        return station is not None and can_manage_municipality(
            current_user, station.udalerria_id
        )

    return False


@router.get("", response_model=list[ErreserbakResponse], status_code=200)
def get_erreserbak(
    session: SessionDep,
    current_user: CurrentUser,
    propioak: bool = False,
):
    expire_stale_reservations(session)

    stmt = select(Erreserba).order_by(Erreserba.hasiera_data_ordua.desc())

    if current_user.rola == "udalerri_admin" and not propioak:
        stmt = (
            stmt.join(KargaPostua, Erreserba.hasierako_karga_postua == KargaPostua.id)
            .join(Kargagunea, KargaPostua.kargagunea_id == Kargagunea.id)
            .where(Kargagunea.udalerria_id == current_user.udalerria_id)
        )
    elif current_user.rola != "admin" or propioak:
        stmt = stmt.where(Erreserba.erabiltzailea_id == current_user.id)

    return [reservation_response(session, erreserba) for erreserba in session.scalars(stmt).all()]


@router.get("/{id}", response_model=ErreserbakResponse, status_code=200)
def get_erreserba_by_id(session: SessionDep, current_user: CurrentUser, id: int):
    expire_stale_reservations(session)
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")
    if not _can_manage(session, current_user, erreserba):
        raise HTTPException(status_code=403, detail="Ez duzu erreserba hau ikusteko baimenik")
    return reservation_response(session, erreserba)


@router.post("", response_model=ErreserbakResponse, status_code=201)
def sortu_erreserba(
    session: SessionDep,
    data: ErreserbakCreate,
    current_user: CurrentUser,
):
    expire_stale_reservations(session)

    active_reservation = session.scalar(
        select(Erreserba.id)
        .where(
            Erreserba.erabiltzailea_id == current_user.id,
            Erreserba.egoera == "aktiboa",
        )
        .limit(1)
    )
    if active_reservation is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Dagoeneko baduzu erreserba aktibo bat. "
                "Itzuli edo ezeztatu lehenago beste bat egiteko."
            ),
        )

    hasiera, amaiera = validate_reservation_window(
        data.hasiera_data_ordua,
        data.amaiera_data_ordua,
    )

    kargagunea = session.get(Kargagunea, data.kargagunea_id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")
    if kargagunea.egoera.lower() != "erabilgarri":
        raise HTTPException(
            status_code=409,
            detail="Kargagunea ez dago erabilgarri",
        )

    if kargagunea.udalerria is not None and not kargagunea.udalerria.aktiboa:
        raise HTTPException(
            status_code=409,
            detail="Udalerria desaktibatuta dago; ezin da erreserbarik egin",
        )

    # Erabiltzaile berak ezin ditu denboran gainjartzen diren bi erreserba izan.
    user_overlap = session.scalar(
        select(Erreserba.id)
        .where(
            Erreserba.erabiltzailea_id == current_user.id,
            Erreserba.egoera == "aktiboa",
            Erreserba.hasiera_data_ordua < amaiera,
            Erreserba.amaiera_data_ordua > hasiera,
        )
        .limit(1)
    )
    if user_overlap is not None:
        raise HTTPException(
            status_code=409,
            detail="Baduzu erreserba bat ordutegi horretan",
        )

    overlapping = (
        select(Erreserba.id)
        .where(
            Erreserba.powerbank_id == Powerbank.id,
            Erreserba.egoera == "aktiboa",
            Erreserba.hasiera_data_ordua < amaiera,
            Erreserba.amaiera_data_ordua > hasiera,
        )
        .exists()
    )

    available = session.execute(
        select(KargaPostua, Powerbank.id)
        .join(Powerbank, Powerbank.karga_postua_id == KargaPostua.id)
        .where(
            KargaPostua.kargagunea_id == data.kargagunea_id,
            KargaPostua.egoera == "kargatuta",
            Powerbank.egoera == "erabilgarri",
            ~overlapping,
        )
        .order_by(KargaPostua.id)
        .with_for_update(of=KargaPostua)
    ).first()

    if available is None:
        raise HTTPException(
            status_code=409,
            detail="Ez dago powerbank erabilgarririk ordutegi horretan",
        )

    available_slot, powerbank_id = available

    erreserba = Erreserba(
        erabiltzailea_id=current_user.id,
        powerbank_id=powerbank_id,
        hasiera_data_ordua=hasiera,
        amaiera_data_ordua=amaiera,
        egikaritze_data_ordua=None,
        amaitze_data_ordua=None,
        hasierako_karga_postua=available_slot.id,
        egoera="aktiboa",
    )

    # Garrantzitsua: ez dugu karga-postuaren egoera fisikoa aldatzen.
    # Erreserba etorkizunekoa izan daiteke eta postua oraindik erabilgarri egon behar du
    # erreserba hasten den arte.
    session.add(erreserba)
    session.commit()
    session.refresh(erreserba)
    return reservation_response(session, erreserba)


@router.patch("/{id}/ordutegia", response_model=ErreserbakResponse, status_code=200)
def aldatu_erreserbaren_ordutegia(
    session: SessionDep,
    data: ErreserbakOrdutegiaUpdate,
    current_user: CurrentUser,
    id: int,
):
    """Aldatu erreserba baten hasiera- eta amaiera-orduak, powerbanka aldatu gabe."""
    expire_stale_reservations(session)
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")
    if not _can_manage(session, current_user, erreserba):
        raise HTTPException(status_code=403, detail="Ez duzu erreserba hau aldatzeko baimenik")
    if erreserba.egoera != "aktiboa":
        raise HTTPException(status_code=409, detail="Erreserba hau ez dago aktibo")
    if erreserba.egikaritze_data_ordua is not None:
        raise HTTPException(
            status_code=409,
            detail="Powerbanka jaso da; ezin da ordutegia aldatu",
        )

    hasiera, amaiera = validate_reservation_window(
        data.hasiera_data_ordua,
        data.amaiera_data_ordua,
    )

    user_overlap = session.scalar(
        select(Erreserba.id)
        .where(
            Erreserba.erabiltzailea_id == erreserba.erabiltzailea_id,
            Erreserba.egoera == "aktiboa",
            Erreserba.id != erreserba.id,
            Erreserba.hasiera_data_ordua < amaiera,
            Erreserba.amaiera_data_ordua > hasiera,
        )
        .limit(1)
    )
    if user_overlap is not None:
        raise HTTPException(
            status_code=409,
            detail="Baduzu beste erreserba bat ordutegi horretan",
        )

    powerbank_overlap = session.scalar(
        select(Erreserba.id)
        .where(
            Erreserba.powerbank_id == erreserba.powerbank_id,
            Erreserba.egoera == "aktiboa",
            Erreserba.id != erreserba.id,
            Erreserba.hasiera_data_ordua < amaiera,
            Erreserba.amaiera_data_ordua > hasiera,
        )
        .limit(1)
    )
    if powerbank_overlap is not None:
        raise HTTPException(
            status_code=409,
            detail="Powerbank hori ez dago erabilgarri ordutegi horretan",
        )

    erreserba.hasiera_data_ordua = hasiera
    erreserba.amaiera_data_ordua = amaiera
    session.commit()
    session.refresh(erreserba)
    return reservation_response(session, erreserba)


@router.patch("/{id}/egoera", response_model=ErreserbakResponse, status_code=200)
def erreserben_egoera_kudeatu(
    session: SessionDep,
    data: ErreserbakEgoeraUpdate,
    current_user: CurrentUser,
    id: int,
):
    expire_stale_reservations(session)
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")

    if not _can_manage(session, current_user, erreserba):
        raise HTTPException(status_code=403, detail="Ez duzu erreserba hau aldatzeko baimenik")

    if current_user.rola != "admin" and data.egoera != "ezeztatua":
        raise HTTPException(
            status_code=403,
            detail="Erabiltzaileek beren erreserbak soilik ezeztatu ditzakete",
        )

    if data.egoera == "ezeztatua":
        # Powerbanka jaso ez bada, erreserba ezeztatu daiteke hasiera-ordua
        # igaro ondoren ere. Jasota badago, itzuli egin behar da.
        if erreserba.egikaritze_data_ordua is not None:
            raise HTTPException(
                status_code=409,
                detail="Powerbanka jaso da; itzuli ezazu ezeztatu beharrean",
            )
        if erreserba.egoera not in ("aktiboa", "amaitua"):
            raise HTTPException(status_code=409, detail="Erreserba hau ez dago aktibo")

        # Datuak zaharretatik datozen erreserbak konpontzeko: lehen bertsioak
        # postua 'hutsa' uzten zuen erreserbatzeko orduan.
        slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
        if slot is not None and slot.egoera == "hutsa":
            powerbank_at_slot = session.scalar(
                select(Powerbank.id)
                .where(Powerbank.karga_postua_id == slot.id)
                .limit(1)
            )
            if powerbank_at_slot is not None:
                slot.egoera = "kargatuta"

    erreserba.egoera = data.egoera
    session.commit()
    session.refresh(erreserba)
    return reservation_response(session, erreserba)


@router.patch("/{id}/recoger", response_model=ErreserbakResponse, status_code=200)
def recoger_powerbank(
    session: SessionDep,
    id: int,
    _admin: Erabiltzailea = Depends(require_admin),
):
    """Marca la recogida real de la powerbank (la taquilla ha leído el QR)."""
    expire_stale_reservations(session)
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")

    pickup_reservation(session, erreserba)
    session.commit()
    session.refresh(erreserba)
    return reservation_response(session, erreserba)


@router.patch("/{id}/devolver", response_model=ErreserbakResponse, status_code=200)
def devolver_powerbank(
    session: SessionDep,
    id: int,
    current_user: Erabiltzailea = Depends(require_manager),
):
    """Devolución de respaldo en la estación de recogida."""
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")

    if not _can_manage(session, current_user, erreserba):
        raise HTTPException(status_code=403, detail="Ez duzu erreserba hau aldatzeko baimenik")

    return_slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
    if return_slot is None:
        raise HTTPException(status_code=404, detail="Itzultzeko karga-postua ez da aurkitzen")

    return_reservation(session, erreserba, return_slot)
    session.commit()
    session.refresh(erreserba)
    return reservation_response(session, erreserba)


@router.patch("/{id}/itzuli", response_model=ErreserbakResponse, status_code=200)
def itzuli_powerbank(
    session: SessionDep,
    data: ErreserbakItzuliUpdate,
    id: int,
    current_user: Erabiltzailea = Depends(require_manager),
):
    """Devolución indicando explícitamente la taquilla de destino."""
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")

    if not _can_manage(session, current_user, erreserba):
        raise HTTPException(status_code=403, detail="Ez duzu erreserba hau aldatzeko baimenik")

    return_slot = session.get(KargaPostua, data.bukaerako_karga_postua)
    if return_slot is None:
        raise HTTPException(status_code=404, detail="Itzultzeko karga-postua ez da aurkitzen")

    return_reservation(
        session,
        erreserba,
        return_slot,
        data.amaitze_data_ordua,
    )
    session.commit()
    session.refresh(erreserba)
    return reservation_response(session, erreserba)


@router.delete("/{id}")
def borrar_erreserba(
    id: int,
    session: SessionDep,
    _admin: Erabiltzailea = Depends(require_admin),
):
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")

    session.delete(erreserba)
    session.commit()
    return {"mensaje": "Erreserba datu-basetik ezabatu da"}
