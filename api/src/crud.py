import datetime
import time

from sqlalchemy.orm import Session, joinedload

from . import models, schemas


def create_file(db: Session, file: schemas.FileCreate, s3_bucket: str, s3_key: str):
    db_file = models.File()

    attrs = file.dict()
    for var, value in attrs.items():
        setattr(db_file, var, value)

    db_file.s3_bucket = s3_bucket
    db_file.s3_key = s3_key
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


def get_video_sources(db: Session):
    db_sources = db.query(models.VideoSource).filter(models.VideoSource.deleted_at == None).all()
    return db_sources


def get_video_source(db: Session, source_id: int):
    db_source = db.get(models.VideoSource, source_id)
    return db_source


def create_video_source(db: Session, source: schemas.VideoSourceCreate):
    db_source = models.VideoSource()

    attrs = source.dict(exclude_unset=True)
    for var, value in attrs.items():
        setattr(db_source, var, value)

    db_source.t_start = time.time()
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source


def update_video_source(db: Session, source_id: int, source: schemas.VideoSourceUpdate):
    db_source = db.get(models.VideoSource, source_id)
    if db_source is None:
        return None

    attrs = source.dict(exclude_unset=True)
    for var, value in attrs.items():
        setattr(db_source, var, value)

    db.commit()
    db.refresh(db_source)
    return db_source


def destroy_inferences(db: Session, source_kind: schemas.SourceKind, source_id: int):
    db_inferences_query = db.query(models.Inference).filter_by(source_kind=source_kind, source_id=source_id)
    db_inference_ids_query = db_inferences_query.with_entities(models.Inference.id)
    db_hits_query = db.query(models.InferenceHit).filter(models.InferenceHit.inference_id.in_(db_inference_ids_query.subquery()))
    db_hits_query.delete()
    db_inferences_query.delete()
    db.commit()
    return True

def create_inference(db: Session, inference: schemas.InferenceCreate):
    db_inference = models.Inference()

    attrs = inference.dict(exclude_unset=True)
    del attrs['hits']
    for var, value in attrs.items():
        setattr(db_inference, var, value)

    for hit in inference.hits:
        db_hit = models.InferenceHit()
        attrs = hit.dict(exclude_unset=True)
        for var, value in attrs.items():
            setattr(db_hit, var, value)

        db_inference.hits.append(db_hit)

    db.add(db_inference)
    db.commit()
    db.refresh(db_inference)
    return db_inference


def create_inferences(db: Session, inferences: list[schemas.InferenceCreate]):
    db_inferences = []
    for inference in inferences:
        db_inference = models.Inference()

        attrs = inference.dict(exclude_unset=True)
        del attrs['hits']
        for var, value in attrs.items():
            setattr(db_inference, var, value)

        for hit in inference.hits:
            db_hit = models.InferenceHit()
            attrs = hit.dict(exclude_unset=True)
            for var, value in attrs.items():
                setattr(db_hit, var, value)

            db_inference.hits.append(db_hit)

        db_inferences.append(db_inference)

    db.bulk_save_objects(db_inferences)
    db.commit()
    return True


def destroy_video_source(db: Session, source_id: int):
    db_source = db.get(models.VideoSource, source_id)
    if db_source is None:
        return None

    db_source.deleted_at = datetime.datetime.now()
    db_source.is_active = False
    db.commit()

    return True


def get_camera_sources(db: Session):
    db_sources = db.query(models.CameraSource).filter(models.CameraSource.deleted_at == None).all()
    return db_sources


def get_camera_source(db: Session, source_id: int):
    db_source = db.get(models.CameraSource, source_id)
    return db_source


def create_camera_source(db: Session, source: schemas.CameraSourceCreate, mmtx_name: str):
    db_source = models.CameraSource()

    attrs = source.dict(exclude_unset=True)
    for var, value in attrs.items():
        setattr(db_source, var, value)

    db_source.url = db_source.private_url # @WIP: Strip of the username and password if present
    db_source.mmtx_name = mmtx_name
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source


def update_camera_source(db: Session, source_id: int, source: schemas.CameraSourceUpdate):
    db_source = db.get(models.CameraSource, source_id)
    if db_source is None:
        return None

    attrs = source.dict(exclude_unset=True)
    for var, value in attrs.items():
        setattr(db_source, var, value)

    db.commit()
    db.refresh(db_source)
    return db_source

def destroy_camera_source(db: Session, source_id: int):
    db_source = db.get(models.CameraSource, source_id)
    if db_source is None:
        return None

    db_source.deleted_at = datetime.datetime.now()
    db_source.is_active = False
    db.commit()

    return True

def get_inferences(db: Session, source_kind: schemas.SourceKind, source_id: int, since_t: float, limit: int):
    q = db.query(models.Inference).options(joinedload(models.Inference.hits))
    q = q.filter_by(source_kind=source_kind, source_id=source_id)
    q = q.filter(models.Inference.t > since_t)
    q = q.order_by(models.Inference.t)
    db_inferences = q.limit(limit).all()
    return db_inferences