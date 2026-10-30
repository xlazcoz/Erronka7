from fastapi import FastAPI
from api_erronka.models.models import Base
from database import engine
from routers import erabiltzaileak, kargaguneak, powerbanks, erreserbak, karga_postuak, login

Base.metadata.create_all(engine)

app = FastAPI()
app.include_router(erabiltzaileak.router)
app.include_router(kargaguneak.router)
app.include_router(powerbanks.router)
app.include_router(erreserbak.router)
app.include_router(karga_postuak.router)
app.include_router(login.router)



# @app.get("/")
# def main():
#     return {"aaa" : "aaa"}