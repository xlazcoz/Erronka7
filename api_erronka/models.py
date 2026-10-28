from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime

class Base(DeclarativeBase):
    pass

class Erabiltzailea(Base):
    __tablename__ = "erabiltzaileak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[String] = mapped_column(String(100))
    abizena: Mapped[String] = mapped_column(String(100))
    login_erabiltzailea: Mapped[String] = mapped_column(String(100))
    login_pasahitza: Mapped[String] = mapped_column(String(100))
    rola: Mapped[String] = mapped_column(String(100))
    erreserben_historikoa: Mapped[String] = mapped_column(String(100))

class Kargagunea(Base):
    __tablename__ = "kargaguneak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[String] = mapped_column(String(100))
    helbidea: Mapped[String] = mapped_column(String(100))
    irudia: Mapped[String] = mapped_column(String(100))
    egoera: Mapped[String] = mapped_column(String(100))

class KargaPostua(Base):
    __tablename__ = "karga_postuak"

    id: Mapped[int] = mapped_column(primary_key=True)
    egoera: Mapped[String] = mapped_column(String(100))
    tamaina: Mapped[String] = mapped_column(String(100))
    kargagunea_id: Mapped[int] = mapped_column(ForeignKey(Kargagunea.id))

class Powerbank(Base):
    __tablename__ = "powerbanks"

    id: Mapped[int] = mapped_column(primary_key=True)
    karga_maila: Mapped[float]
    potentzia: Mapped[float]
    tamaina: Mapped[String] = mapped_column(String(100))
    karga_postua_id: Mapped[int] = mapped_column(ForeignKey(KargaPostua.id))

class Erreserba(Base):
    __tablename__ = "erreserbak"

    erabiltzailea_id: Mapped[int] = mapped_column(primary_key=True)
    powerbank_id: Mapped[int] = mapped_column(primary_key=True)
    hasiera_data_ordua: Mapped[datetime]
    amaiera_data_ordua: Mapped[datetime]
    egikaritze_data_ordua: Mapped[datetime]
    amaitze_data_ordua: Mapped[datetime]
    hasierako_karga_postua: Mapped[int]
    bukaerako_karga_postua: Mapped[int]
    egoera: Mapped[String] = mapped_column(String(100))

