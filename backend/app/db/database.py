from urllib.parse import urlparse, urlunparse

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def ensure_postgres_database(database_url: str) -> None:
    """Connect to the default postgres DB and create the target database if missing."""
    normalized = database_url.replace("postgresql+psycopg2://", "postgresql://", 1)
    if not normalized.startswith("postgresql://"):
        return
    parsed = urlparse(normalized)
    db_name = (parsed.path or "").lstrip("/")
    if not db_name or db_name == "postgres":
        return
    admin_url = urlunparse((parsed.scheme, parsed.netloc, "/postgres", "", "", ""))
    conn = psycopg2.connect(admin_url)
    try:
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", (db_name,)
            )
            if cur.fetchone() is None:
                cur.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name))
                )
    finally:
        conn.close()


ensure_postgres_database(settings.DATABASE_URL)

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
