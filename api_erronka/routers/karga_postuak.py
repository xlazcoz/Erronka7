from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models.models import KargaPostua, Powerbank
from schemas.schemas import KargaPostuaResponse, KargaPostuaCreate
from services.auth import require_admin

router = APIRouter(
    prefix="/kargapostuak",
    tags=["Karga postuak"],
    dependencies=[Depends(require_admin)],
)

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[KargaPostuaResponse], status_code=200)
def get_karga_postuak(session: SessionDep):
    stmt = select(KargaPostua).order_by(KargaPostua.id)
    return session.scalars(stmt).all()

@router.post("", response_model=KargaPostuaResponse, status_code=201)
def sortu_karga_postua(session: SessionDep, data: KargaPostuaCreate):
    karga_postua = KargaPostua(egoera=data.egoera, kargagunea_id=data.kargagunea_id)
    session.add(karga_postua)
    session.commit()
    session.refresh(karga_postua)

    return karga_postua

@router.delete("/{id}", response_model=KargaPostuaResponse, status_code=200)
def ezabatu_karga_postua(session: SessionDep, id: int):
    karga_postua = session.get(KargaPostua, id)

    if not karga_postua:
        raise HTTPException(status_code=404, detail="Karga postua ez da aurkitzen")

    powerbank = session.scalar(
        select(Powerbank.id).where(Powerbank.karga_postua_id == id).limit(1)
    )
    if powerbank is not None:
        raise HTTPException(
            status_code=409,
            detail="Karga postu honek powerbank-ak ditu, ezin da ezabatu",
        )

    session.delete(karga_postua)
    session.commit()
    return karga_postua