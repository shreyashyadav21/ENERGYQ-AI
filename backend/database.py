import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./energyq_local.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class GridIncidentLog(Base):
    __tablename__ = "grid_incidents"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), index=True)
    event_type = Column(String(64))
    title = Column(String(255))
    locality = Column(String(128))
    feeder_id = Column(String(64))
    severity = Column(String(32))
    crew_assigned = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(Text, nullable=True)

class ApplianceAuditLog(Base):
    __tablename__ = "appliance_audits"

    id = Column(Integer, primary_key=True, index=True)
    appliance_id = Column(String(64))
    action = Column(String(32))  # ON, OFF, SCHEDULED
    kw_reading = Column(Float)
    actor_id = Column(String(128), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class UserGridIncident(Base):
    __tablename__ = "user_grid_incidents"

    id = Column(String(36), primary_key=True)
    reporter_id = Column(String(128), index=True, nullable=False)
    reporter_ref = Column(String(128), nullable=True)
    category = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)
    locality = Column(String(128), nullable=False)
    status = Column(String(32), default="open", nullable=False)
    response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

# Create tables
Base.metadata.create_all(bind=engine)

# Add the audit actor column to databases created by earlier demo versions.
if "appliance_audits" in inspect(engine).get_table_names():
    audit_columns = {column["name"] for column in inspect(engine).get_columns("appliance_audits")}
    if "actor_id" not in audit_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE appliance_audits ADD COLUMN actor_id VARCHAR(128)"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
