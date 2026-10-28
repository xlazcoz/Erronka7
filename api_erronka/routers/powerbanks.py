from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models import Powerbank
from schemas import PowerbankCreate, PowerbankResponse

router = APIRouter(prefix="/powerbanks", tags=["Powerbanks"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[PowerbankResponse])
def get_powerbanks(session: SessionDep):
    stmt = select(Powerbank).order_by(Powerbank.id)
    return session.scalars(stmt).all()

@router.post("", response_model=PowerbankResponse)
def sortu_powerbank(session: SessionDep, data: PowerbankCreate):
    powerbank = Powerbank(karga_maila=data.karga_maila, potentzia=data.potentzia, tamaina=data.tamaina)
    session.add(powerbank)
    session.commit()
    session.refresh(powerbank)

    return powerbank

