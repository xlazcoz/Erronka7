from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from constants import (
    ERRESERBA_EGOERAK,
    KARGA_POSTU_TAMAINAK,
    KARGA_POSTUA_EGOERAK,
    KARGAGUNEA_EGOERAK,
    POWERBANK_EGOERAK,
    ROLAK,
    sql_balioak,
)


class Base(DeclarativeBase):
    pass


class Erabiltzailea(Base):
    __tablename__ = "erabiltzaileak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[str] = mapped_column(String(100))
    abizena: Mapped[str] = mapped_column(String(100))
    login_email: Mapped[str] = mapped_column(String(100))
    login_pasahitza: Mapped[str] = mapped_column(String(255))
    rola: Mapped[str] = mapped_column(String(100), default="user")
    aktiboa: Mapped[bool] = mapped_column(Boolean, default=True)
    udalerria_id: Mapped[int | None] = mapped_column(
        ForeignKey("udalerriak.id", ondelete="SET NULL"), nullable=True, default=None
    )

    udalerria: Mapped[Udalerria | None] = relationship(back_populates="erabiltzaileak")
    erreserbak: Mapped[list[Erreserba]] = relationship(back_populates="erabiltzailea")
    auth_sessions: Mapped[list[AuthSession]] = relationship(back_populates="erabiltzailea")

    __table_args__ = (
        CheckConstraint(f"rola IN ({sql_balioak(ROLAK)})", name="erabiltzaileak_rola_check"),
        CheckConstraint(
            "rola <> 'udalerri_admin' OR udalerria_id IS NOT NULL",
            name="erabiltzaileak_udalerri_admin_check",
        ),
        # Emaila maiuskulaz/minuskulaz independentea izan dadin.
        Index(
            "erabiltzaileak_login_email_uidx",
            func.lower(login_email),
            unique=True,
        ),
    )

    @property
    def udalerria_izena(self) -> str | None:
        return self.udalerria.izena if self.udalerria is not None else None


class Udalerria(Base):
    __tablename__ = "udalerriak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[str] = mapped_column(String(100))
    aktiboa: Mapped[bool] = mapped_column(Boolean, default=True)

    kargaguneak: Mapped[list[Kargagunea]] = relationship(back_populates="udalerria")
    erabiltzaileak: Mapped[list[Erabiltzailea]] = relationship(back_populates="udalerria")

    __table_args__ = (
        UniqueConstraint("izena", name="udalerriak_izena_uidx"),
    )


class Kargagunea(Base):
    __tablename__ = "kargaguneak"

    id: Mapped[int] = mapped_column(primary_key=True)
    izena: Mapped[str] = mapped_column(String(100))
    helbidea: Mapped[str] = mapped_column(String(255))
    irudia1: Mapped[str] = mapped_column(String(1000))
    irudia2: Mapped[str] = mapped_column(String(1000))
    irudia3: Mapped[str] = mapped_column(String(1000))
    egoera: Mapped[str] = mapped_column(String(100), default="erabilgarri")

    udalerria_id: Mapped[int | None] = mapped_column(
        ForeignKey("udalerriak.id", ondelete="SET NULL"), nullable=True, default=None
    )
    latitud: Mapped[float | None] = mapped_column(nullable=True, default=None)
    longitud: Mapped[float | None] = mapped_column(nullable=True, default=None)

    udalerria: Mapped[Udalerria | None] = relationship(back_populates="kargaguneak")
    karga_postuak: Mapped[list[KargaPostua]] = relationship(back_populates="kargagunea")

    __table_args__ = (
        CheckConstraint(
            f"egoera IN ({sql_balioak(KARGAGUNEA_EGOERAK)})",
            name="kargaguneak_egoera_check",
        ),
        CheckConstraint(
            "latitud IS NULL OR (latitud >= -90 AND latitud <= 90)",
            name="kargaguneak_latitud_check",
        ),
        CheckConstraint(
            "longitud IS NULL OR (longitud >= -180 AND longitud <= 180)",
            name="kargaguneak_longitud_check",
        ),
    )

    @property
    def udalerria_izena(self) -> str | None:
        return self.udalerria.izena if self.udalerria is not None else None


class KargaPostua(Base):
    __tablename__ = "karga_postuak"

    id: Mapped[int] = mapped_column(primary_key=True)
    egoera: Mapped[str] = mapped_column(String(100), default="hutsa")
    tamaina: Mapped[str] = mapped_column(String(100), default="estandar")
    kargagunea_id: Mapped[int] = mapped_column(
        ForeignKey("kargaguneak.id", ondelete="RESTRICT")
    )

    kargagunea: Mapped[Kargagunea] = relationship(back_populates="karga_postuak")
    powerbanks: Mapped[list[Powerbank]] = relationship(back_populates="karga_postua")

    __table_args__ = (
        CheckConstraint(
            f"egoera IN ({sql_balioak(KARGA_POSTUA_EGOERAK)})",
            name="karga_postuak_egoera_check",
        ),
        CheckConstraint(
            f"tamaina IN ({sql_balioak(KARGA_POSTU_TAMAINAK)})",
            name="karga_postuak_tamaina_check",
        ),
    )


class Powerbank(Base):
    __tablename__ = "powerbanks"

    id: Mapped[int] = mapped_column(primary_key=True)
    karga_maila: Mapped[float]
    egoera: Mapped[str] = mapped_column(String(100), default="erabilgarri")
    karga_postua_id: Mapped[int] = mapped_column(
        ForeignKey("karga_postuak.id", ondelete="RESTRICT")
    )

    karga_postua: Mapped[KargaPostua] = relationship(back_populates="powerbanks")
    erreserbak: Mapped[list[Erreserba]] = relationship(back_populates="powerbank")

    __table_args__ = (
        UniqueConstraint("karga_postua_id", name="powerbanks_karga_postua_id_uidx"),
        CheckConstraint(
            "karga_maila >= 0 AND karga_maila <= 100",
            name="powerbanks_karga_maila_check",
        ),
        CheckConstraint(
            f"egoera IN ({sql_balioak(POWERBANK_EGOERAK)})",
            name="powerbanks_egoera_check",
        ),
    )


class Erreserba(Base):
    __tablename__ = "erreserbak"

    id: Mapped[int] = mapped_column(primary_key=True)

    erabiltzailea_id: Mapped[int] = mapped_column(
        ForeignKey("erabiltzaileak.id", ondelete="RESTRICT")
    )
    powerbank_id: Mapped[int] = mapped_column(
        ForeignKey("powerbanks.id", ondelete="RESTRICT")
    )

    hasiera_data_ordua: Mapped[datetime]
    amaiera_data_ordua: Mapped[datetime]
    egikaritze_data_ordua: Mapped[datetime | None] = mapped_column(
        nullable=True, default=None
    )
    amaitze_data_ordua: Mapped[datetime | None] = mapped_column(
        nullable=True, default=None
    )

    hasierako_karga_postua: Mapped[int] = mapped_column(
        ForeignKey("karga_postuak.id", ondelete="RESTRICT")
    )
    bukaerako_karga_postua: Mapped[int | None] = mapped_column(
        ForeignKey("karga_postuak.id", ondelete="RESTRICT"),
        nullable=True,
        default=None,
    )

    egoera: Mapped[str] = mapped_column(String(100), default="aktiboa")

    # QR bakarra: erabiltzaileak deskargatzen du eta taquillak irakurtzen du.
    qr_token: Mapped[str] = mapped_column(
        String(64), default=lambda: uuid4().hex
    )
    berandu: Mapped[bool] = mapped_column(Boolean, default=False)
    karga_extra: Mapped[float] = mapped_column(default=0.0)

    erabiltzailea: Mapped[Erabiltzailea] = relationship(back_populates="erreserbak")
    powerbank: Mapped[Powerbank] = relationship(back_populates="erreserbak")
    hasierako_postua: Mapped[KargaPostua] = relationship(
        foreign_keys=[hasierako_karga_postua]
    )
    bukaerako_postua: Mapped[KargaPostua | None] = relationship(
        foreign_keys=[bukaerako_karga_postua]
    )

    __table_args__ = (
        CheckConstraint(
            "amaiera_data_ordua > hasiera_data_ordua",
            name="erreserbak_data_tartea_check",
        ),
        CheckConstraint(
            "egikaritze_data_ordua IS NULL OR egikaritze_data_ordua >= hasiera_data_ordua",
            name="erreserbak_egikaritze_data_check",
        ),
        CheckConstraint(
            "amaitze_data_ordua IS NULL OR amaitze_data_ordua >= hasiera_data_ordua",
            name="erreserbak_amaitze_data_check",
        ),
        CheckConstraint(
            "amaitze_data_ordua IS NULL OR egikaritze_data_ordua IS NULL "
            "OR amaitze_data_ordua >= egikaritze_data_ordua",
            name="erreserbak_data_orden_check",
        ),
        CheckConstraint(
            f"egoera IN ({sql_balioak(ERRESERBA_EGOERAK)})",
            name="erreserbak_egoera_check",
        ),
        Index("erreserbak_qr_token_uidx", "qr_token", unique=True),
        Index(
            "erreserbak_erabiltzaile_aktibo_uidx",
            "erabiltzailea_id",
            unique=True,
            postgresql_where=text("egoera = 'aktiboa'"),
        ),
    )


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    erabiltzailea_id: Mapped[int] = mapped_column(
        ForeignKey("erabiltzaileak.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    erabiltzailea: Mapped[Erabiltzailea] = relationship(back_populates="auth_sessions")
