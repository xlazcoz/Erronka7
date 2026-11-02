from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator
from typing import Optional, List

class ErreserbakResponse(BaseModel):
    id: int
    erabiltzailea_id: int
    powerbank_id: int
    hasiera_data_ordua: datetime
    amaiera_data_ordua: datetime
    egikaritze_data_ordua: datetime
    amaitze_data_ordua: datetime
    hasierako_karga_postua: int
    bukaerako_karga_postua: Optional[int] = None
    egoera: str

    model_config = ConfigDict(from_attributes=True)


class ErreserbakCreate(BaseModel):
    kargagunea_id: int = Field(gt=0)
    hasiera_data_ordua: datetime
    amaiera_data_ordua: datetime

    @field_validator("amaiera_data_ordua")
    @classmethod
    def amaiera_geroago(cls, value: datetime, info: ValidationInfo) -> datetime:
        hasiera = info.data.get("hasiera_data_ordua")
        if hasiera is not None and value <= hasiera:
            raise ValueError("Amaiera-data hasiera-data baino geroagokoa izan behar da")
        return value


class ErreserbakUpdate(BaseModel):
    hasiera_data_ordua: Optional[datetime] = None
    amaiera_data_ordua: Optional[datetime] = None
    egikaritze_data_ordua: Optional[datetime] = None
    amaitze_data_ordua: Optional[datetime] = None
    hasierako_karga_postua: Optional[int] = None
    bukaerako_karga_postua: Optional[int] = None
    egoera: Optional[str] = None

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        if value is not None:
            kargagunea_egoera = {"aktiboa", "ezeztatua", "amaitua"}
            if value not in kargagunea_egoera:
                raise ValueError("Egoera hauetako bat izan behar da: aktiboa, ezeztatua, amaitua")
        return value


class ErreserbakEgoeraUpdate(BaseModel):
    egoera: str = Field(min_length=1)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        kargagunea_egoera = {"aktiboa", "ezeztatua", "amaitua"}
        if value not in kargagunea_egoera:
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
    erreserbak: List[ErreserbakResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ErabiltzaileaCreate(BaseModel):
    izena: str = Field(min_length=1, max_length=100)
    abizena: str = Field(min_length=1, max_length=100)
    login_email: str = Field(min_length=1, max_length=100)
    login_pasahitza: str = Field(min_length=1, max_length=100)
    rola: str = Field(default="user", min_length=1, max_length=100)


class ErabiltzaileaUpdate(BaseModel):
    izena: Optional[str] = None
    abizena: Optional[str] = None
    login_email: Optional[str] = None
    login_pasahitza: Optional[str] = None  
    rola: Optional[str] = None


class ErabiltzaileaRolaUpdate(BaseModel):
    rola: str = Field(min_length=1, max_length=100)

class KargaguneaResponse(BaseModel):
    id: int
    izena: str
    helbidea: str
    irudia1: str
    irudia2: str
    irudia3: str
    egoera: str
    libres: int = 0
    karga_postuak: List[KargaPostuaResponse] = []

    model_config = ConfigDict(from_attributes=True)

class KargaguneaCreate(BaseModel):
    izena: str = Field(min_length=1, max_length=100)
    helbidea: str = Field(min_length=1, max_length=100)
    irudia1: str = Field(min_length=1, max_length=100)
    irudia2: str = Field(min_length=1, max_length=100)
    irudia3: str = Field(min_length=1, max_length=100)
    egoera: str = Field(min_length=1, max_length=100)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        kargagunea_egoera = {"erabilgarri", "mantentze-lanetan", "zerbitzutik kanpo"}
        if value not in kargagunea_egoera:
            raise ValueError("Egoera hauetako bat izan behar da: erabilgarri, mantentze-lanetan, zerbitzutik kanpo")
        return value

class KargaguneaUpdate(BaseModel):
    izena: Optional[str] = Field(default=None, min_length=1, max_length=100)
    helbidea: Optional[str] = Field(default=None, min_length=1, max_length=100)
    irudia1: Optional[str] = Field(default=None, min_length=1, max_length=100)
    irudia2: Optional[str] = Field(default=None, min_length=1, max_length=100)
    irudia3: Optional[str] = Field(default=None, min_length=1, max_length=100)
    egoera: Optional[str] = Field(default=None, min_length=1, max_length=100)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            kargagunea_egoera = {"erabilgarri", "mantentze-lanetan", "zerbitzutik kanpo"}
            if value not in kargagunea_egoera:
                raise ValueError("Egoera hauetako bat izan behar da: erabilgarri, mantentze-lanetan, zerbitzutik kanpo")
        return value

class KargaguneaIrudiaUpdate(BaseModel):
    irudia: Optional[str] = Field(default=None, min_length=1, max_length=100)



class KargaPostuaResponse(BaseModel):
    id: int
    egoera: str
    tamaina: str
    kargagunea_id: int

    model_config = ConfigDict(from_attributes=True)

class KargaPostuaCreate(BaseModel):
    egoera: str = Field(min_length=1, max_length=100)
    tamaina: str = Field(min_length=1, max_length=100)
    kargagunea_id: int = Field(gt=0)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        kargagunea_egoera = {"hutsa", "kargatuta", "kargatzen"}
        if value not in kargagunea_egoera:
            raise ValueError("Egoera hauetako bat izan behar da: hutsa, kargatuta, kargatzen")
        return value

    @field_validator("tamaina")
    @classmethod
    def tamaina_balidatu(cls, value: str) -> str:
        powerbank_tamaina = {"txikia", "ertaina", "handia"}
        if value not in powerbank_tamaina:
            raise ValueError("Tamaina hauetako bat izan behar da: txikia, ertaina, handia")
        return value

class PowerbankBase(BaseModel):
    karga_postua_id: int = Field(gt=0)

class PowerbankCreate(PowerbankBase):
    karga_maila: float = Field(le=100)
    egoera: str
    karga_postua_id: int = Field(ge=1)

class PowerbankUpdate(BaseModel):
    karga_postua_id: Optional[int] = Field(default=None, gt=0)

class PowerbankResponse(PowerbankBase):
    id: int
    karga_maila: float
    egoera: str
    karga_postua_id: int
    class Config:
        from_attributes = True

Powerbank = PowerbankResponse


class RegisterRequest(BaseModel):
    izena: str = Field(min_length=2, max_length=100)
    login_email: str = Field(min_length=2, max_length=100)
    login_pasahitza: str = Field(min_length=2, max_length=100)

class LoginRequest(BaseModel):
    login_email: str = Field(min_length=2, max_length=100)
    login_pasahitza: str = Field(min_length=2, max_length=100)