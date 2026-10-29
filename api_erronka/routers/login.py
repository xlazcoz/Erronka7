from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_session
from schemas import LoginRequest, RegisterRequest, ErabiltzaileaResponse
from models import AuthSession, Erabiltzailea

router = APIRouter(prefix="/login", tags=["Login"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.post("/register", response_model=ErabiltzaileaResponse, status_code=201)
def erregistratu(session: SessionDep, data: RegisterRequest):
    pass

@router.post("")
def login(session: SessionDep, data: LoginRequest):
    pass