from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = ("postgresql+psycopg://postgres:postgres@localhost:5432/alokairu_sistema")

engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def get_session():
    with SessionLocal() as session:
        yield session


