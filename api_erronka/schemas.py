from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

class ErabiltzaileaResponse(BaseModel):
    id: int
    izena: str
    abizena:str
    login_erabiltzailea: str
    login_pasahitza: str
    rola: str
    erreserben_historikoa: str

    model_config = ConfigDict(from_attributes=True)

class ErabiltzaileaCreate(BaseModel):
    izena: str
    abizena: str
    login_erabiltzailea: str
    login_pasahitza: str
    rola: str
    erreserben_historikoa: str

class ErabiltzaileaUpdate(BaseModel):
    pass

class KargaguneaResponse(BaseModel):
    id: int
    izena: str
    helbidea: str
    irudia: str
    egoera: str

    model_config = ConfigDict(from_attributes=True)

class KargaguneaCreate(BaseModel):
    izena: str
    helbidea: str
    irudia: str
    egoera: str

class KargaguneaUpdate(BaseModel):
    pass

class PowerbankResponse(BaseModel):
    id: int
    karga_maila: float
    potentzia: float
    tamaina: int
    karga_postua_id: int

    model_config = ConfigDict(from_attributes=True)

class PowerbankCreate(BaseModel):
    karga_maila: float
    potentzia: float
    tamaina: int
    #karga_postua_id: int

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
    egoera: str
    