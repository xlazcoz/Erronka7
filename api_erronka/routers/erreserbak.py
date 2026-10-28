from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_session
from models import Erreserba
from schemas import ErreserbakCreate, ErreserbakResponse

router = APIRouter(prefix="/erreserbak", tags=["Erreserbak"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get("", response_model=list[ErreserbakResponse])
def get_erreserbak(session: SessionDep):
    stmt = select(Erreserba)
    return session.scalars(stmt).all()