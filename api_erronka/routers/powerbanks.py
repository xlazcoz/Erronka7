from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models import Powerbank
from schemas import PowerbankCreate, PowerbankResponse, PowerbankUpdate

router = APIRouter(prefix="/powerbanks", tags=["Powerbanks"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[PowerbankResponse])
def get_powerbanks(session: SessionDep):
    stmt = select(Powerbank).order_by(Powerbank.id)
    return session.scalars(stmt).all()

@router.post("", response_model=PowerbankResponse)
def sortu_powerbank(session: SessionDep, data: PowerbankCreate):
    powerbank = Powerbank(karga_maila=data.karga_maila, potentzia=data.potentzia, tamaina=data.tamaina,
                            karga_postua_id=data.karga_postua_id)
    session.add(powerbank)
    session.commit()
    session.refresh(powerbank)

    return powerbank

@router.patch("{id}", response_model=PowerbankResponse)
def powerbank_tokia_aldatu(session: SessionDep, data: PowerbankUpdate, id: int):
    powerbank = session.get(Powerbank, id)
    
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(powerbank, field, value)

    session.commit()
    session.refresh(powerbank)

    return powerbank

