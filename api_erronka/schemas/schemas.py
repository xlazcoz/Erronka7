from datetime import datetime, timedelta

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from constants import (
    ERRESERBA_EGOERAK,
    KARGA_POSTU_TAMAINAK,
    KARGA_POSTUA_EGOERAK,
    KARGAGUNEA_EGOERAK,
    POWERBANK_EGOERAK,
    ROLAK,
)


class ErreserbakResponse(BaseModel):
    id: int
    erabiltzailea_id: int
    powerbank_id: int
    hasiera_data_ordua: datetime
    amaiera_data_ordua: datetime
    egikaritze_data_ordua: datetime | None = None
    amaitze_data_ordua: datetime | None = None
    hasierako_karga_postua: int
    bukaerako_karga_postua: int | None = None
    egoera: str
    qr_token: str = ""
    berandu: bool = False
    karga_extra: float = 0.0

    # Erabiltzailearen konturako laguntza-eremuak.
    kargagunea_id: int | None = None
    kargagunea_izena: str | None = None
    karga_postua_izena: str | None = None
    bukaerako_kargagunea_izena: str | None = None
    bukaerako_karga_postua_izena: str | None = None
    powerbank_karga_maila: float | None = None

    model_config = ConfigDict(from_attributes=True)


class ErreserbakCreate(BaseModel):
    kargagunea_id: int = Field(gt=0)
    hasiera_data_ordua: datetime
    amaiera_data_ordua: datetime

    @model_validator(mode="after")
    def balidatu_iraupena(self):
        if self.amaiera_data_ordua <= self.hasiera_data_ordua:
            raise ValueError("Amaiera-data hasiera-data baino geroagokoa izan behar da")

        iraupena = self.amaiera_data_ordua - self.hasiera_data_ordua
        if iraupena < timedelta(minutes=15):
            raise ValueError("Erreserbak gutxienez 15 minutu iraun behar du")
        if iraupena > timedelta(hours=6):
            raise ValueError("Erreserbak gehienez 6 ordu iraun dezake")
        return self


class ErreserbakOrdutegiaUpdate(BaseModel):
    hasiera_data_ordua: datetime
    amaiera_data_ordua: datetime

    @model_validator(mode="after")
    def balidatu_iraupena(self):
        if self.amaiera_data_ordua <= self.hasiera_data_ordua:
            raise ValueError("Amaiera-data hasiera-data baino geroagokoa izan behar da")

        iraupena = self.amaiera_data_ordua - self.hasiera_data_ordua
        if iraupena < timedelta(minutes=15):
            raise ValueError("Erreserbak gutxienez 15 minutu iraun behar du")
        if iraupena > timedelta(hours=6):
            raise ValueError("Erreserbak gehienez 6 ordu iraun dezake")
        return self


class QrScanRequest(BaseModel):
    token: str = Field(min_length=8, max_length=64)
    kargagunea_id: int = Field(gt=0)


class ErreserbakUpdate(BaseModel):
    hasiera_data_ordua: datetime | None = None
    amaiera_data_ordua: datetime | None = None
    egikaritze_data_ordua: datetime | None = None
    amaitze_data_ordua: datetime | None = None
    hasierako_karga_postua: int | None = None
    bukaerako_karga_postua: int | None = None
    egoera: str | None = None

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        if value is not None and value not in ERRESERBA_EGOERAK:
            raise ValueError("Egoera hauetako bat izan behar da: aktiboa, ezeztatua, amaitua")
        return value


class ErreserbakEgoeraUpdate(BaseModel):
    egoera: str = Field(min_length=1)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        if value not in ERRESERBA_EGOERAK:
            raise ValueError("Egoera hauetako bat izan behar da: aktiboa, ezeztatua, amaitua")
        return value


class ErreserbakItzuliUpdate(BaseModel):
    bukaerako_karga_postua: int  
    amaitze_data_ordua: datetime = Field(default_factory=datetime.now)
    egoera: str = "amaitua"


class ErabiltzaileaResponse(BaseModel):
    id: int
    izena: str
    abizena: str
    login_email: str
    rola: str
    aktiboa: bool = True
    udalerria_id: int | None = None
    udalerria_izena: str | None = None
    erreserbak: list[ErreserbakResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ErabiltzaileaCreate(BaseModel):
    izena: str = Field(min_length=1, max_length=100)
    abizena: str = Field(min_length=1, max_length=100)
    login_email: str = Field(min_length=1, max_length=100)
    login_pasahitza: str = Field(min_length=1, max_length=100)
    rola: str = Field(default="user", min_length=1, max_length=100)
    aktiboa: bool = True
    udalerria_id: int | None = Field(default=None, gt=0)

    @field_validator("rola")
    @classmethod
    def rola_balidatu(cls, value: str) -> str:
        if value not in ROLAK:
            raise ValueError("Rola hauetako bat izan behar da: user, udalerri_admin, admin")
        return value


class ErabiltzaileaUpdate(BaseModel):
    izena: str | None = None
    abizena: str | None = None
    login_email: str | None = None
    login_pasahitza: str | None = None
    rola: str | None = None
    aktiboa: bool | None = None
    udalerria_id: int | None = Field(default=None, gt=0)

    @field_validator("rola")
    @classmethod
    def rola_balidatu(cls, value: str | None) -> str | None:
        if value is not None and value not in ROLAK:
            raise ValueError("Rola hauetako bat izan behar da: user, udalerri_admin, admin")
        return value


class ErabiltzaileaRolaUpdate(BaseModel):
    rola: str = Field(min_length=1, max_length=100)
    udalerria_id: int | None = Field(default=None, gt=0)

    @field_validator("rola")
    @classmethod
    def rola_balidatu(cls, value: str) -> str:
        if value not in ROLAK:
            raise ValueError("Rola hauetako bat izan behar da: user, udalerri_admin, admin")
        return value

class UdalerriaResponse(BaseModel):
    id: int
    izena: str
    aktiboa: bool

    model_config = ConfigDict(from_attributes=True)


class UdalerriaCreate(BaseModel):
    izena: str = Field(min_length=1, max_length=100)
    aktiboa: bool = True


class UdalerriaUpdate(BaseModel):
    izena: str | None = Field(default=None, min_length=1, max_length=100)
    aktiboa: bool | None = None


class KargaguneaResponse(BaseModel):
    id: int
    izena: str
    helbidea: str
    irudia1: str
    irudia2: str
    irudia3: str
    egoera: str
    udalerria_id: int | None = None
    udalerria_izena: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    libres: int = 0
    karga_postuak: list[KargaPostuaResponse] = []

    model_config = ConfigDict(from_attributes=True)

class KargaguneaCreate(BaseModel):
    izena: str = Field(min_length=1, max_length=100)
    helbidea: str = Field(min_length=1, max_length=255)
    irudia1: str = Field(min_length=1, max_length=1000)
    irudia2: str = Field(min_length=1, max_length=1000)
    irudia3: str = Field(min_length=1, max_length=1000)
    egoera: str = Field(min_length=1, max_length=100)
    udalerria_id: int | None = Field(default=None, gt=0)
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        normalized = value.strip().lower().replace(" ", "-")
        if normalized not in KARGAGUNEA_EGOERAK:
            raise ValueError("Egoera hauetako bat izan behar da: erabilgarri, mantentze-lanetan, zerbitzutik-kanpo")
        return normalized

class KargaguneaUpdate(BaseModel):
    izena: str | None = Field(default=None, min_length=1, max_length=100)
    helbidea: str | None = Field(default=None, min_length=1, max_length=255)
    irudia1: str | None = Field(default=None, min_length=1, max_length=1000)
    irudia2: str | None = Field(default=None, min_length=1, max_length=1000)
    irudia3: str | None = Field(default=None, min_length=1, max_length=1000)
    egoera: str | None = Field(default=None, min_length=1, max_length=100)
    udalerria_id: int | None = Field(default=None, gt=0)
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str | None) -> str | None:
        if value is not None:
            normalized = value.strip().lower().replace(" ", "-")
            if normalized not in KARGAGUNEA_EGOERAK:
                raise ValueError("Egoera hauetako bat izan behar da: erabilgarri, mantentze-lanetan, zerbitzutik-kanpo")
            return normalized
        return value

class KargaguneaIrudiaUpdate(BaseModel):
    irudia1: str | None = Field(default=None, min_length=1, max_length=1000)
    irudia2: str | None = Field(default=None, min_length=1, max_length=1000)
    irudia3: str | None = Field(default=None, min_length=1, max_length=1000)



class KargaPostuaResponse(BaseModel):
    id: int
    egoera: str
    tamaina: str | None = None
    kargagunea_id: int

    model_config = ConfigDict(from_attributes=True)

class KargaPostuaCreate(BaseModel):
    egoera: str = Field(min_length=1, max_length=100)
    tamaina: str = Field(default="estandar", min_length=1, max_length=100)
    kargagunea_id: int = Field(gt=0)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in KARGA_POSTUA_EGOERAK:
            raise ValueError("Egoera hauetako bat izan behar da: hutsa, kargatuta, kargatzen")
        return normalized

    @field_validator("tamaina")
    @classmethod
    def tamaina_balidatu(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in KARGA_POSTU_TAMAINAK:
            raise ValueError("Tamaina hauetako bat izan behar da: txikia, ertaina, handia, estandar")
        return normalized


class KargaPostuaUpdate(BaseModel):
    egoera: str | None = Field(default=None, min_length=1, max_length=100)
    tamaina: str | None = Field(default=None, min_length=1, max_length=100)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str | None) -> str | None:
        if value is not None:
            normalized = value.strip().lower()
            if normalized not in KARGA_POSTUA_EGOERAK:
                raise ValueError("Egoera hauetako bat izan behar da: hutsa, kargatuta, kargatzen")
            return normalized
        return value

    @field_validator("tamaina")
    @classmethod
    def tamaina_balidatu(cls, value: str | None) -> str | None:
        if value is not None:
            normalized = value.strip().lower()
            if normalized not in KARGA_POSTU_TAMAINAK:
                raise ValueError("Tamaina hauetako bat izan behar da: txikia, ertaina, handia, estandar")
            return normalized
        return value


class PowerbankBase(BaseModel):
    # id: int
    karga_maila: float = Field(ge=0, le=100)
    egoera: str = Field(default="erabilgarri", min_length=1, max_length=100)
    karga_postua_id: int = Field(gt=0)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in POWERBANK_EGOERAK:
            raise ValueError(
                "Egoera hauetako bat izan behar da: "
                "erabilgarri, erreserbatua, erabiltzen, mantentze-lanetan, zerbitzutik-kanpo"
            )
        return normalized
    

class PowerbankCreate(PowerbankBase):
    # karga_maila: float = Field(le=100)
    # karga_postua_id: int = Field(ge=1)
    pass

class PowerbankUpdate(BaseModel):
    karga_maila: float | None = Field(default=None, ge=0, le=100)
    karga_postua_id: int | None = Field(default=None, gt=0)
    egoera: str | None = Field(default=None, min_length=1, max_length=100)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str | None) -> str | None:
        if value is not None:
            normalized = value.strip().lower()
            if normalized not in POWERBANK_EGOERAK:
                raise ValueError(
                    "Egoera hauetako bat izan behar da: "
                    "erabilgarri, erreserbatua, erabiltzen, mantentze-lanetan, zerbitzutik-kanpo"
                )
            return normalized
        return value

class PowerbankResponse(PowerbankBase):
    id: int
    # karga_maila: float
    # karga_postua_id: int
    class Config:
        from_attributes = True



class RegisterRequest(BaseModel):
    izena: str = Field(min_length=2, max_length=100)
    abizena: str = Field(default="", max_length=100)
    login_email: EmailStr
    login_pasahitza: str = Field(min_length=8, max_length=100)

    @field_validator("izena", "abizena")
    @classmethod
    def garbitu_izena(cls, value: str) -> str:
        return value.strip()

    @field_validator("login_email", mode="before")
    @classmethod
    def normalizatu_emaila(cls, value: str) -> str:
        return value.strip().lower() if isinstance(value, str) else value

class LoginRequest(BaseModel):
    login_email: str = Field(min_length=2, max_length=100)
    login_pasahitza: str = Field(min_length=1, max_length=100)

    @field_validator("login_email", mode="before")
    @classmethod
    def normalizatu_emaila(cls, value: str) -> str:
        return value.strip().lower() if isinstance(value, str) else value


class ProfileUpdate(BaseModel):
    izena: str | None = Field(default=None, min_length=2, max_length=100)
    abizena: str | None = Field(default=None, max_length=100)
    login_email: EmailStr | None = None

    @field_validator("izena", "abizena")
    @classmethod
    def garbitu_izena(cls, value: str | None) -> str | None:
        return value.strip() if isinstance(value, str) else value

    @field_validator("login_email", mode="before")
    @classmethod
    def normalizatu_emaila(cls, value: str) -> str:
        return value.strip().lower() if isinstance(value, str) else value


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=100)
    new_password: str = Field(min_length=8, max_length=100)