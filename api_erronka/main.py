from fastapi import FastAPI
from models import Base
from database import engine
from routers import erabiltzaileak, kargaguneak, powerbanks, erreserbak, karga_postuak

Base.metadata.create_all(engine)

app = FastAPI()
app.include_router(erabiltzaileak.router)
app.include_router(kargaguneak.router)
app.include_router(powerbanks.router)
app.include_router(erreserbak.router)
app.include_router(karga_postuak.router)


# @app.get("/")
# def main():
#     return {"aaa" : "aaa"}