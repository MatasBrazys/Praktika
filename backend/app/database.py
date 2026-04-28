from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False  # Log SQL queries (disable in production)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def run_column_migrations() -> None:
    """Add new columns to existing tables without a full migration framework."""
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE form_definitions "
            "ADD COLUMN IF NOT EXISTS requires_confirmation BOOLEAN NOT NULL DEFAULT TRUE"
        ))
        conn.commit()


# Dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

