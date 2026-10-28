from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models import Kargagunea
from schemas import KargaguneaCreate, KargaguneaResponse

router = APIRouter(prefix="/kargaguneak", tags=["Kargaguneak"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[KargaguneaResponse])
def get_kargaguneak(session: SessionDep):
    stmt = select(Kargagunea).order_by(Kargagunea.id)
    return session.scalars(stmt).all()

@router.get("/{id}", response_model=KargaguneaResponse)
def get_kargaguneak_id(session: SessionDep, id: int):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")
    return kargagunea

@router.post("", response_model=KargaguneaResponse)
def sortu_kargagunea(session: SessionDep, data: KargaguneaCreate):
    kargagunea = Kargagunea(izena=data.izena, helbidea=data.helbidea, irudia=data.irudia, egoera=data.egoera)
    session.add(kargagunea)
    session.commit()
    session.refresh(kargagunea)

    return kargagunea

@router.put("/{id}", response_model=KargaguneaResponse)
def aldatu_kargagunea():
    pass

@router.patch("/{id}", response_model=KargaguneaResponse)
def partzialki_aldatu_kargagunea():
    pass

@router.delete("{id}", response_model=KargaguneaResponse)
def ezabatu_kargagunea():
    pass