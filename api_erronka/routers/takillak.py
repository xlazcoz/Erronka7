from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models.models import Takilla
from schemas.schemas import TakillaResponse, TakillaCreate

router = APIRouter(prefix="/takillak", tags=["Takillak"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[TakillaResponse], status_code=200)
def get_takillak(session: SessionDep):
    stmt = select(Takilla).order_by(Takilla.id)
    return session.scalars(stmt).all()

@router.post("", response_model=TakillaResponse, status_code=201)
def sortu_takillak(session: SessionDep, data: TakillaCreate):
    takilla = Takilla(egoera=data.egoera, kargagunea_id=data.kargagunea_id)
    session.add(takilla)
    session.commit()
    session.refresh(takilla)

    return takilla

@router.delete("/{id}", response_model=TakillaResponse, status_code=200)
def ezabatu_takilla(session: SessionDep, id: int):
    takilla = session.get(Takilla, id)

    if not takilla:
        raise HTTPException(status_code=404, detail="Takilla ez da aurkitzen")
    
    session.delete(takilla)
    session.commit()
    return takilla