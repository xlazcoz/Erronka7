from fastapi import FastAPI
from models.models import Base
from database import engine
from routers import erabiltzaileak, kargaguneak, powerbanks, erreserbak, login, takillak

Base.metadata.create_all(engine)

app = FastAPI()
app.include_router(erabiltzaileak.router)
app.include_router(kargaguneak.router)
app.include_router(powerbanks.router)
app.include_router(erreserbak.router)
app.include_router(takillak.router)
app.include_router(login.router)



@app.get("/")
def main():
    return {"mezua" : "Ongi etorri powerbank alokairu sistemara"}