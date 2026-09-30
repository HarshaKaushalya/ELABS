import os
from sqlalchemy import create_engine
import pymysql

# PyMySQL needs to be registered as the MySQL driver if not default, but mysql+pymysql handles it
# Read connection details from environment (matching api/.env defaults)
MYSQL_HOST = os.environ.get("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = os.environ.get("MYSQL_PORT", "3306")
MYSQL_USER = os.environ.get("MYSQL_USER", "elabs")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "elabs")
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "elabs")

db_url = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"

# Create SQLAlchemy engine with connection pooling
engine = create_engine(
    db_url,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600
)

def get_connection():
    """Returns a raw PyMySQL connection or a SQLAlchemy connection."""
    return engine.connect()

def execute_query(query: str, params: dict = None):
    """Executes a query and returns the results as a list of dicts."""
    import sqlalchemy
    with engine.connect() as conn:
        result = conn.execute(sqlalchemy.text(query), params or {})
        if result.returns_rows:
            # Convert rows to dictionaries
            return [dict(row._mapping) for row in result]
        return None
