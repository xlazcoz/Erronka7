from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime


class Base(DeclarativeBase):
    pass

class Erabiltzailea(Base):
    __tablename__ = "erabiltzaileak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[str] = mapped_column(String(100))
    abizena: Mapped[str] = mapped_column(String(100))
    login_email: Mapped[str] = mapped_column(String(100))
    login_pasahitza: Mapped[str] = mapped_column(String(100))
    rola: Mapped[str] = mapped_column(String(100))
    erreserben_historikoa: Mapped[str] = mapped_column(String(100))

    erreserbak: Mapped[list["Erreserba"]] = relationship(back_populates="erabiltzailea")
    auth_sessions: Mapped[list["AuthSession"]] = relationship(back_populates="erabiltzailea")

class Kargagunea(Base):
    __tablename__ = "kargaguneak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[str] = mapped_column(String(100))
    helbidea: Mapped[str] = mapped_column(String(100))
    irudia1: Mapped[str] = mapped_column(String(100))
    irudia2: Mapped[str] = mapped_column(String(100))
    irudia3: Mapped[str] = mapped_column(String(100))
    egoera: Mapped[str] = mapped_column(String(100))

    takillak: Mapped[list["Takilla"]] = relationship(back_populates="kargagunea")

class Takilla(Base):
    __tablename__ = "takillak"

    id: Mapped[int] = mapped_column(primary_key=True)
    egoera: Mapped[str] = mapped_column(String(100))
    tamaina: Mapped[str] = mapped_column(String(100))
    kargagunea_id: Mapped[int] = mapped_column(ForeignKey(Kargagunea.id))

    kargagunea: Mapped["Kargagunea"] = relationship(back_populates="takillak")

class Powerbank(Base):
    __tablename__ = "powerbanks"

    id: Mapped[int] = mapped_column(primary_key=True)
    karga_maila: Mapped[float]
    egoera: Mapped[str] = mapped_column(String(100))
    takilla_id: Mapped[int] = mapped_column(ForeignKey(Takilla.id))

    erreserbak: Mapped[list["Erreserba"]] = relationship(back_populates="powerbank")

class Erreserba(Base):
    __tablename__ = "erreserbak"

    erabiltzailea_id: Mapped[int] = mapped_column(ForeignKey(Erabiltzailea.id) ,primary_key=True)
    powerbank_id: Mapped[int] = mapped_column(ForeignKey(Powerbank.id) ,primary_key=True)
    hasiera_data_ordua: Mapped[datetime]
    amaiera_data_ordua: Mapped[datetime]
    egikaritze_data_ordua: Mapped[datetime]
    amaitze_data_ordua: Mapped[datetime]
    hasierako_takilla: Mapped[int] = mapped_column(ForeignKey(Takilla.id))
    bukaerako_takilla: Mapped[int] = mapped_column(ForeignKey(Takilla.id))
    egoera: Mapped[str] = mapped_column(String(100))

    erabiltzailea: Mapped["Erabiltzailea"] = relationship(back_populates="erreserbak")
    powerbank: Mapped["Powerbank"] = relationship(back_populates="erreserbak")

class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)

    erabiltzailea_id: Mapped[int] = mapped_column(ForeignKey(Erabiltzailea.id))

    erabiltzailea: Mapped["Erabiltzailea"] = relationship(back_populates="auth_sessions")