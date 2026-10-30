from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models import Kargagunea
from schemas import KargaguneaCreate, KargaguneaResponse, KargaguneaUpdate, KargaguneaIrudiaUpdate

router = APIRouter(prefix="/kargaguneak", tags=["Kargaguneak"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[KargaguneaResponse], status_code=200)
def get_kargaguneak(session: SessionDep):
    stmt = select(Kargagunea).order_by(Kargagunea.id)
    return session.scalars(stmt).all()

@router.get("/{id}", response_model=KargaguneaResponse, status_code=200)
def get_kargaguneak_id(session: SessionDep, id: int):
    kargagunea = session.get(Kargagunea, id)
    if kargagunea is None:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")
    return kargagunea

@router.post("", response_model=KargaguneaResponse, status_code=201)
def sortu_kargagunea(session: SessionDep, data: KargaguneaCreate):
    kargagunea = Kargagunea(izena=data.izena, helbidea=data.helbidea, irudia=data.irudia, egoera=data.egoera)
    session.add(kargagunea)
    session.commit()
    session.refresh(kargagunea)

    return kargagunea


@router.patch("/{id}", response_model=KargaguneaResponse, status_code=200)
def aldatu_kargagunea(session: SessionDep, data: KargaguneaUpdate, id: int):
    kargagunea = session.get(Kargagunea, id)
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(kargagunea, field, value)

    session.commit()
    session.refresh(kargagunea)

    return kargagunea

@router.patch("/{id}/irudia", response_model=KargaguneaResponse, status_code=200)
def aldatu_irudia(session: SessionDep, data: KargaguneaIrudiaUpdate, id: int):
    kargagunea = session.get(Kargagunea, id)
    kargagunea.irudia = data.irudia

    session.commit()

    return kargagunea

@router.delete("/{id}", response_model=KargaguneaResponse, status_code=200)
def ezabatu_kargagunea(session: SessionDep, id: int):
    kargagunea = session.get(Kargagunea, id)

    if not kargagunea:
        raise HTTPException(status_code=404, detail="Kargagunea ez da aurkitzen")

    session.delete(kargagunea)
    session.commit()
    return kargagunea