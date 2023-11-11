from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Enum, JSON, Double, DateTime
from sqlalchemy.orm import relationship, Mapped

from src.database import Base
from src.schemas import SourceKind


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    content_type = Column(String)
    s3_bucket = Column(String)
    s3_key = Column(String)


class VideoSource(Base):
    __tablename__ = "video_sources"

    id = Column(Integer, primary_key=True, index=True)
    is_active = Column(Boolean)
    deleted_at = Column(DateTime, nullable=True)
    name = Column(String)
    t_start = Column(Double)
    file_id = Column(Integer, ForeignKey("files.id"))

    file = relationship("File")


class CameraSource(Base):
    __tablename__ = "camera_sources"

    id = Column(Integer, primary_key=True, index=True)
    is_active = Column(Boolean)
    deleted_at = Column(DateTime, nullable=True)
    name = Column(String)
    url = Column(String)
    mmtx_name = Column(String)


class Inference(Base):
    __tablename__ = "inferences"

    id = Column(Integer, primary_key=True, index=True)
    t = Column(Double)

    source_kind = Column(Enum(SourceKind))
    source_id = Column(Integer)

    hits = relationship("InferenceHit", back_populates="inference", cascade="all, delete-orphan")


class InferenceHit(Base):
    __tablename__ = "inference_hits"

    id = Column(Integer, primary_key=True, index=True)
    x = Column(Double)
    y = Column(Double)
    w = Column(Double)
    h = Column(Double)
    c = Column(Double, comment='Confidence')
    track_id = Column(Integer, nullable=True)

    inference_id = Column(Integer, ForeignKey("inferences.id"))
    inference = relationship("Inference", back_populates="hits")

    file_id = Column(Integer, ForeignKey("files.id"))
    file = relationship("File")
