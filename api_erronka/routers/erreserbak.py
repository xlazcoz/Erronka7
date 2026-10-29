from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models import Erreserba
from schemas import ErreserbakUpdate, ErreserbakResponse, ErreserbakEgoeraUpdate

router = APIRouter(prefix="/erreserbak", tags=["Erreserbak"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[ErreserbakResponse], status_code=200)
def get_erreserbak(session: SessionDep):
    stmt = select(Erreserba)
    return session.scalars(stmt).all()

@router.patch("/{id}/egoera", response_model=ErreserbakResponse, status_code=200)
def erreserben_egoera_kudeatu(session: SessionDep, data: ErreserbakEgoeraUpdate, id: int):
    erreserba = session.get(Erreserba, id)
    erreserba.egoera = data.egoera

    session.commit()
    session.refresh(erreserba)

    return erreserba