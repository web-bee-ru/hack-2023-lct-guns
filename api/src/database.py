from os import getenv

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = getenv("DATABASE_URL")
DATABASE_ECHO = getenv("DATABASE_ECHO", 'False').lower() in ('true', '1', 't', 'yes', 'y')

engine = None
if DATABASE_URL is None:
    raise "DATABASE_URL env is missing"
if DATABASE_URL.startswith('sqlite://'):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=DATABASE_ECHO)
else:
    engine = create_engine(DATABASE_URL, echo=DATABASE_ECHO)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()