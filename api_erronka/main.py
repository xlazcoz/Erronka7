from fastapi import FastAPI
from models.models import Base
from database import engine, ensure_schema
from fastapi.middleware.cors import CORSMiddleware
from routers import erabiltzaileak, kargaguneak, powerbanks, erreserbak, karga_postuak, login, udalerriak

Base.metadata.create_all(engine)
ensure_schema()

app = FastAPI()
app.include_router(erabiltzaileak.router)
app.include_router(kargaguneak.router)
app.include_router(powerbanks.router)
app.include_router(erreserbak.router)
app.include_router(karga_postuak.router)
app.include_router(login.router)
app.include_router(udalerriak.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def main():
    return {"mezua" : "Ongi etorri powerbank alokairu sistemara"}
