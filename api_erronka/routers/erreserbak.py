from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models.models import Erreserba, KargaPostua, Powerbank, Erabiltzailea
from services.auth import get_current_user
from schemas.schemas import (
    ErreserbakCreate, 
    ErreserbakResponse, 
    ErreserbakEgoeraUpdate, 
    ErreserbakItzuliUpdate
)

router = APIRouter(prefix="/erreserbak", tags=["Erreserbak"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[ErreserbakResponse], status_code=200)
def get_erreserbak(
    session: SessionDep,
    current_user: Erabiltzailea = Depends(get_current_user),
):
    stmt = select(Erreserba).order_by(Erreserba.id)
    if current_user.rola != "admin":
        stmt = stmt.where(Erreserba.erabiltzailea_id == current_user.id)
    return session.scalars(stmt).all()

@router.get("/{id}", response_model=ErreserbakResponse, status_code=200)
def get_erreserba_by_id(session: SessionDep, id: int):
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")
    return erreserba

@router.post("", response_model=ErreserbakResponse, status_code=201)
def sortu_erreserba(
    session: SessionDep,
    data: ErreserbakCreate,
    current_user: Erabiltzailea = Depends(get_current_user),
):
    available = session.execute(
        select(KargaPostua, Powerbank.id)
        .join(Powerbank, Powerbank.karga_postua_id == KargaPostua.id)
        .where( 
            KargaPostua.kargagunea_id == data.kargagunea_id,
            KargaPostua.egoera == "kargatuta",
            ~select(Erreserba.id)
            .where(
                Erreserba.hasierako_karga_postua == KargaPostua.id,
                Erreserba.egoera == "aktiboa",
                Erreserba.hasiera_data_ordua < data.amaiera_data_ordua,
                Erreserba.amaiera_data_ordua > data.hasiera_data_ordua,
            )
            .exists(),
        )
        .order_by(KargaPostua.id)
        .with_for_update(of=KargaPostua)
    ).first() 
    if available is None:
        raise HTTPException(status_code=409, detail="Ez dago powerbank erabilgarririk ordutegi horretan")
    available_slot, powerbank_id = available

    erreserba = Erreserba(
        erabiltzailea_id=current_user.id,
        powerbank_id=powerbank_id,
        hasiera_data_ordua=data.hasiera_data_ordua,
        amaiera_data_ordua=data.amaiera_data_ordua,
        egikaritze_data_ordua=data.hasiera_data_ordua,
        amaitze_data_ordua=data.amaiera_data_ordua,
        hasierako_karga_postua=available_slot.id,
        egoera="aktiboa",
    )
    available_slot.egoera = "hutsa"
    session.add(erreserba)
    session.commit()
    session.refresh(erreserba)
    return erreserba

@router.patch("/{id}/egoera", response_model=ErreserbakResponse, status_code=200)
def erreserben_egoera_kudeatu(session: SessionDep, data: ErreserbakEgoeraUpdate, id: int):
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")

    if erreserba.egoera == "aktiboa" and data.egoera == "ezeztatua":
        slot = session.get(KargaPostua, erreserba.hasierako_karga_postua)
        if slot is not None:
            slot.egoera = "kargatuta"

    erreserba.egoera = data.egoera
    session.commit()
    session.refresh(erreserba)
    return erreserba

@router.patch("/{id}/itzuli", response_model=ErreserbakResponse, status_code=200)
def itzuli_powerbank(session: SessionDep, data: ErreserbakItzuliUpdate, id: int):
    erreserba = session.get(Erreserba, id)
    if not erreserba:
        raise HTTPException(status_code=404, detail="Erreserba ez da aurkitzen")

    slot = session.get(KargaPostua, data.bukaerako_karga_postua)
    if slot is not None:
        slot.egoera = "kargatuta"

    powerbank = session.get(Powerbank, erreserba.powerbank_id)
    if powerbank is not None:
        powerbank.karga_postua_id = data.bukaerako_karga_postua

    erreserba.bukaerako_karga_postua = data.bukaerako_karga_postua
    erreserba.amaitze_data_ordua = data.amaitze_data_ordua
    erreserba.egoera = data.egoera

    session.commit()
    session.refresh(erreserba)
    return erreserba

@router.delete("/{id}")
def borrar_erreserba(id: int, db: Session = Depends(get_session)):
    erreserba = db.query(Erreserba).filter(Erreserba.id == id).first()
    if not erreserba:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if erreserba.egoera == "aktiboa":
        slot = db.get(KargaPostua, erreserba.hasierako_karga_postua)
        if slot is not None:
            slot.egoera = "kargatuta"

    db.delete(erreserba)
    db.commit()
    return {"mensaje": "Reserva eliminada de la base de datos"}