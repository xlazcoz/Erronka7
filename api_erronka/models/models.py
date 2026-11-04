from datetime import datetime
from typing import Optional
from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Udalerria(Base):
    __tablename__ = "udalerriak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[str] = mapped_column(String(100), unique=True)
    aktiboa: Mapped[bool] = mapped_column(default=True)

    kargaguneak: Mapped[list["Kargagunea"]] = relationship(back_populates="udalerria")
    erabiltzaileak: Mapped[list["Erabiltzailea"]] = relationship(back_populates="udalerria")


class Erabiltzailea(Base):
    __tablename__ = "erabiltzaileak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[str] = mapped_column(String(100))
    abizena: Mapped[str] = mapped_column(String(100))
    login_email: Mapped[str] = mapped_column(String(100))
    login_pasahitza: Mapped[str] = mapped_column(String(100))
    rola: Mapped[str] = mapped_column(String(100), default="user")
    aktiboa: Mapped[bool] = mapped_column(default=True)
    udalerria_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("udalerriak.id"), nullable=True
    )

    udalerria: Mapped[Optional["Udalerria"]] = relationship(back_populates="erabiltzaileak")
    erreserbak: Mapped[list["Erreserba"]] = relationship(back_populates="erabiltzailea")
    auth_sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="erabiltzailea",
        cascade="all, delete-orphan",
    )

class Kargagunea(Base):
    __tablename__ = "kargaguneak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[str] = mapped_column(String(100))
    helbidea: Mapped[str] = mapped_column(String(100))
    irudia1: Mapped[str] = mapped_column(String(1000))
    irudia2: Mapped[str] = mapped_column(String(1000))
    irudia3: Mapped[str] = mapped_column(String(1000))
    egoera: Mapped[str] = mapped_column(String(100))
    udalerria_id: Mapped[int] = mapped_column(ForeignKey("udalerriak.id"))
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    udalerria: Mapped["Udalerria"] = relationship(back_populates="kargaguneak")
    karga_postuak: Mapped[list["KargaPostua"]] = relationship(back_populates="kargagunea")

class KargaPostua(Base):
    __tablename__ = "karga_postuak"

    id: Mapped[int] = mapped_column(primary_key=True)
    egoera: Mapped[str] = mapped_column(String(100))
    kargagunea_id: Mapped[int] = mapped_column(ForeignKey("kargaguneak.id"))

    kargagunea: Mapped["Kargagunea"] = relationship(back_populates="karga_postuak")

class Powerbank(Base):
    __tablename__ = "powerbanks"

    id: Mapped[int] = mapped_column(primary_key=True)
    karga_maila: Mapped[float]
    karga_postua_id: Mapped[int] = mapped_column(ForeignKey("karga_postuak.id"))

    erreserbak: Mapped[list["Erreserba"]] = relationship(back_populates="powerbank")

class Erreserba(Base):
    __tablename__ = "erreserbak"

    id: Mapped[int] = mapped_column(primary_key=True)

    erabiltzailea_id: Mapped[int] = mapped_column(ForeignKey("erabiltzaileak.id"))
    powerbank_id: Mapped[int] = mapped_column(ForeignKey("powerbanks.id"))

    hasiera_data_ordua: Mapped[datetime]
    amaiera_data_ordua: Mapped[datetime]
    egikaritze_data_ordua: Mapped[datetime]
    amaitze_data_ordua: Mapped[datetime]

    hasierako_karga_postua: Mapped[int] = mapped_column(ForeignKey("karga_postuak.id"))
    
    bukaerako_karga_postua: Mapped[Optional[int]] = mapped_column(
        ForeignKey("karga_postuak.id"), nullable=True, default=None
    )
    
    egoera: Mapped[str] = mapped_column(String(100), default="aktiboa")

    erabiltzailea: Mapped["Erabiltzailea"] = relationship(back_populates="erreserbak")
    powerbank: Mapped["Powerbank"] = relationship(back_populates="erreserbak")

class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    erabiltzailea_id: Mapped[int] = mapped_column(ForeignKey("erabiltzaileak.id"))

    erabiltzailea: Mapped["Erabiltzailea"] = relationship(back_populates="auth_sessions")