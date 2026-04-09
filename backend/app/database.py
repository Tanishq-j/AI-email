import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import redis

# Load environment variables from .env
load_dotenv()

# Database Connection (Postgres)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/email_intelligence")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Queue Connection (Redis)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

def get_redis_client():
    return redis.Redis.from_url(REDIS_URL, decode_responses=True)

# Connection Verification for Test
if __name__ == "__main__":
    try:
        # Test Postgres
        with engine.connect() as connection:
            print("Successfully connected to Postgres DB.")
        
        # Test Redis
        r = get_redis_client()
        r.ping()
        print("Successfully connected to Redis queue.")
    except Exception as e:
        print(f"Error connecting to backend services: {e}")
