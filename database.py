from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in environment variables")

# Create engine
if "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL:
    # Add SSL mode to connection string
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
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
