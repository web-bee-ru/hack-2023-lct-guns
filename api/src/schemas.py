from enum import Enum

from pydantic import BaseModel, json


class Result(BaseModel):
    ok: bool


class FileBase(BaseModel):
    name: str
    content_type: str


class FileCreate(FileBase):
    pass


class File(FileBase):
    id: int
    s3_bucket: str
    s3_key: str

    class Config:
        from_attributes = True


class FileCreateResponse(BaseModel):
    file: File
    s3_presigned_fields: dict

    class Config:
        from_attributes = True


class VideoSourceBase(BaseModel):
    name: str
    t_start: float  # @DOC: unix seconds


class VideoSourceCreate(VideoSourceBase):
    file_id: int


class VideoSource(VideoSourceBase):
    id: int
    file: File

    class Config:
        from_attributes = True


class CameraSourceBase(BaseModel):
    name: str
    url: str


class CameraSourceCreate(CameraSourceBase):
    pass


class CameraSource(CameraSourceBase):
    id: int
    mmtx_name: str

    class Config:
        from_attributes = True


class SourceKind(Enum):
    Video = 'Video'
    Camera = 'Camera'

    class Config:
        from_attributes = True


class InferenceHitBase(BaseModel):
    x: float
    y: float
    w: float
    h: float
    c: float

    class Config:
        from_attributes = True

class InferenceHitCreate(InferenceHitBase):
    pass

class InferenceHit(InferenceHitBase):
    id: int

    class Config:
        from_attributes = True


class InferenceBase(BaseModel):
    t: float
    hits: list[InferenceHitBase]

    class Config:
        from_attributes = True


class InferenceCreate(InferenceBase):
    hits: list[InferenceHitCreate]

    source_kind: SourceKind
    source_id: int
    pass


class Inference(InferenceBase):
    id: int
    hits: list[InferenceHit]

    class Config:
        from_attributes = True
