from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models.models import Erreserba, Powerbank
from schemas.schemas import PowerbankCreate, PowerbankResponse, PowerbankUpdate

router = APIRouter(prefix="/powerbanks", tags=["Powerbanks"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[PowerbankResponse], status_code=200)
def get_powerbanks(session: SessionDep):
    stmt = select(Powerbank).order_by(Powerbank.id)
    return session.scalars(stmt).all()

@router.post("", response_model=PowerbankResponse, status_code=201)
def sortu_powerbank(session: SessionDep, data: PowerbankCreate):
    powerbank = Powerbank(
        karga_maila=data.karga_maila,
        karga_postua_id=data.karga_postua_id
    )
    session.add(powerbank)
    session.commit()
    session.refresh(powerbank)
    return powerbank

# Corregida la barra en la ruta: "/{id}"
@router.patch("/{id}", response_model=PowerbankResponse, status_code=200)
def powerbank_tokia_aldatu(session: SessionDep, data: PowerbankUpdate, id: int):
    powerbank = session.get(Powerbank, id)
    if not powerbank:
        raise HTTPException(status_code=404, detail="Powerbank ez da aurkitzen")
    
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(powerbank, field, value)

    session.commit()
    session.refresh(powerbank)
    return powerbank

@router.delete("/{id}", response_model=PowerbankResponse, status_code=200)
def ezabatu_powerbank(session: SessionDep, id: int):
    powerbank = session.get(Powerbank, id)

    if not powerbank:
        raise HTTPException(status_code=404, detail="Powerbank ez da aurkitzen")

    erreserba = session.scalar(
        select(Erreserba.id).where(Erreserba.powerbank_id == id).limit(1)
    )
    if erreserba is not None:
        raise HTTPException(
            status_code=409,
            detail="Powerbank honek erreserbak ditu, ezin da ezabatu",
        )

    session.delete(powerbank)
    session.commit()
    return powerbank