from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine with SSL
if "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL:
    if "?" not in DATABASE_URL:
        database_url_with_ssl = DATABASE_URL + "?sslmode=require"
    else:
        database_url_with_ssl = DATABASE_URL + "&sslmode=require"
    
    engine = create_engine(
        database_url_with_ssl,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args={
            "connect_timeout": 10,
            "options": "-c statement_timeout=30000"
        }
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()