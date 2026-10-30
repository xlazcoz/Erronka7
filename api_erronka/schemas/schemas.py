from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator



class ErabiltzaileaResponse(BaseModel):
    id: int
    izena: str
    abizena:str
    login_email: str
    #login_pasahitza: str
    rola: str
    erreserben_historikoa: str

    model_config = ConfigDict(from_attributes=True)

class ErabiltzaileaErreserbakResponse(BaseModel):
    erreserben_historikoa: str

class ErabiltzaileaCreate(BaseModel):
    izena: str = Field(min_length=1, max_length=100)
    abizena: str = Field(min_length=1, max_length=100)
    login_email: str = Field(min_length=1, max_length=100)
    login_pasahitza: str = Field(min_length=1, max_length=100)
    rola: str = Field(min_length=1, max_length=100)
    erreserben_historikoa: str = Field(min_length=1, max_length=100)

    
class ErabiltzaileaUpdate(BaseModel):
    izena: str = Field(min_length=1)
    abizena: str = Field(min_length=1)
    login_email: str = Field(min_length=1, max_length=100)
    login_pasahitza: str = Field(min_length=1, max_length=100)
    rola: str = Field(min_length=1, max_length=100)
    erreserben_historikoa: str = Field(min_length=1, max_length=100)

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
    izena: str = Field(min_length=1, max_length=100)
    helbidea: str = Field(min_length=1, max_length=100)
    irudia1: str | None = Field(default=None, min_length=1, max_length=100)
    irudia2: str | None = Field(default=None, min_length=1, max_length=100)
    irudia3: str | None = Field(default=None, min_length=1, max_length=100)
    egoera: str = Field(min_length=1, max_length=100)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        kargagunea_egoera = {"erabilgarri", "mantentze-lanetan", "zerbitzutik kanpo"}
        if value not in kargagunea_egoera:
            raise ValueError("Egoera hauetako bat izan behar da: erabilgarri, mantentze-lanetan, zerbitzutik kanpo")
        return value

class KargaguneaIrudiaUpdate(BaseModel):
    irudia: str | None = Field(default=None, min_length=1, max_length=100)

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

class PowerbankResponse(BaseModel):
    id: int
    karga_maila: float
    potentzia: float
    tamaina: str
    karga_postua_id: int

    model_config = ConfigDict(from_attributes=True)

class PowerbankCreate(BaseModel):
    karga_maila: float = Field(le=100)
    potentzia: float = Field(ge=1)
    tamaina: str = Field(min_length=1, max_length=100)
    karga_postua_id: int = Field(ge=1)

    @field_validator("tamaina")
    @classmethod
    def tamaina_balidatu(cls, value: str) -> str:
        powerbank_tamaina = {"txikia", "ertaina", "handia"}
        if value not in powerbank_tamaina:
            raise ValueError("Tamaina hauetako bat izan behar da: txikia, ertaina, handia")
        return value

class PowerbankUpdate(BaseModel):
    karga_postua_id: int = Field(ge=1)

class ErreserbakResponse(BaseModel):
    erabiltzailea_id: int
    powerbank_id: int
    hasiera_data_ordua: datetime
    amaiera_data_ordua: datetime
    egikaritze_data_ordua: datetime
    amaitze_data_ordua: datetime
    hasierako_karga_postua: datetime
    bukaerako_karga_postua: datetime
    egoera: str

    model_config = ConfigDict(from_attributes=True)

class ErreserbakCreate(BaseModel):
    hasiera_data_ordua: datetime
    amaiera_data_ordua: datetime
    egikaritze_data_ordua: datetime
    amaitze_data_ordua: datetime
    hasierako_karga_postua: datetime
    bukaerako_karga_postua: datetime
    egoera: str = Field(min_length=1)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
        kargagunea_egoera = {"aktiboa", "ezeztatua", "amaitua"}
        if value not in kargagunea_egoera:
            raise ValueError("Egoera hauetako bat izan behar da: aktiboa, ezeztatua, amaitua")
        return value

class ErreserbakUpdate(BaseModel):
    hasiera_data_ordua: datetime
    amaiera_data_ordua: datetime
    egikaritze_data_ordua: datetime
    amaitze_data_ordua: datetime
    hasierako_karga_postua: datetime
    bukaerako_karga_postua: datetime
    egoera: str = Field(min_length=1)

    @field_validator("egoera")
    @classmethod
    def egoera_balidatu(cls, value: str) -> str:
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

class RegisterRequest(BaseModel):
    izena: str = Field(min_length=2, max_length=100)
    login_email: str = Field(min_length=2, max_length=100)
    login_pasahitza: str = Field(min_length=2, max_length=100)

class LoginRequest(BaseModel):
    login_email: str = Field(min_length=2, max_length=100)
    login_pasahitza: str = Field(min_length=2, max_length=100)