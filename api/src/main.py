import asyncio
import time

import cv2
from botocore.client import BaseClient
from dotenv import load_dotenv
from starlette.responses import JSONResponse

from src.ml.guns import Runner

load_dotenv()

from os import getenv

import uuid
from contextlib import asynccontextmanager

import botocore
from fastapi import FastAPI, APIRouter, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import boto3
from pydantic import BaseModel, Field

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from src import crud, models, schemas
from src.database import SessionLocal, engine

# @NOTE: Use migrations instead
# models.Base.metadata.create_all(bind=engine)

app = FastAPI()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


FILES_BUCKET = getenv('S3_BUCKET')


def get_s3_client():
    # @REFERENCE: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/migrations3.html#accessing-a-bucket
    s3_client = boto3.client(
        's3',
        endpoint_url=getenv('S3_ENDPOINT_URL'),
        aws_access_key_id=getenv('S3_ACCESS_KEY_ID'),
        aws_secret_access_key=getenv('S3_SECRET_ACCESS_KEY'),
        aws_session_token=None,
        config=boto3.session.Config(signature_version='s3v4'),
        verify=False
    )
    exists = True
    try:
        s3_client.head_bucket(Bucket=FILES_BUCKET)
    except botocore.exceptions.ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            exists = False
    if not exists:
        s3_client.create_bucket(Bucket=FILES_BUCKET)
        # @WIP: Auto make bucket public? Currently, we have to do this manually.
    try:
        yield s3_client
    finally:
        pass


origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post('/v1/files')
def upload_file(
        file: schemas.FileCreate,
        db: Session = Depends(get_db),
        s3_client=Depends(get_s3_client)
) -> schemas.FileCreateResponse:
    s3_bucket = FILES_BUCKET
    s3_key = str(uuid.uuid4())
    response = s3_client.generate_presigned_post(
        s3_bucket,
        s3_key,
        Fields={'Content-Type': file.content_type},
        Conditions=[{'Content-Type': file.content_type}],
        ExpiresIn=600
    )
    db_file = crud.create_file(db, file, s3_bucket, s3_key)
    return schemas.FileCreateResponse(file=db_file, s3_presigned_fields=response['fields'])


@app.get("/v1/video-sources")
def read_video_sources(db: Session = Depends(get_db)) -> list[schemas.VideoSource]:
    db_sources = crud.get_video_sources(db)
    return db_sources


async def infer_video_source_task(
        source_id: int,
        db: Session,
        s3_client: BaseClient,
):
    db_source = crud.get_video_source(db, source_id)
    if db_source is None:
        return

    if not db_source.is_active:
        return

    db_file: models.File = db_source.file
    url = s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': db_file.s3_bucket,
            'Key': db_file.s3_key,
        },
        ExpiresIn=3600)

    def run():
        runner = Runner()
        cap = cv2.VideoCapture(url)
        n_frames = 0
        # start_time = time.time()
        crud.destroy_inferences(db, schemas.SourceKind.Video, db_source.id)

        rt_start = time.time()

        # inference_buffer = []
        # def push_inferences() -> bool:
        #     crud.create_inferences(db, inference_buffer)
        #     inference_buffer.clear()
        #     db.refresh(db_source)
        #     return db_source.is_active

        while True:
            ret = cap.grab()
            if not ret:
                break

            dpt = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
            drt = time.time() - rt_start

            # @NOTE: Skip frames if we are behind realtime
            if dpt / drt < 1:
                continue

            pt = db_source.t_start + dpt

            status, frame = cap.retrieve()

            hits = runner.infer(frame, dpt)
            inference = schemas.InferenceCreate(t=pt, hits=hits, source_kind=schemas.SourceKind.Video, source_id=db_source.id)
            # inference_buffer.append(inference)
            crud.create_inference(db, inference)

            n_frames += 1
            if n_frames % 100 == 0:
                print(f'Processed {n_frames} frames')

            # if len(inference_buffer) == 25:
            #     still_active = push_inferences()
            #     if not still_active:
            #         break
        cap.release()
        # push_inferences()

    await asyncio.to_thread(run)

@app.post('/v1/video-sources')
def create_video_source(
        source: schemas.VideoSourceCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        s3_client = Depends(get_s3_client),
) -> schemas.VideoSource:
    db_source = crud.create_video_source(db, source)
    background_tasks.add_task(infer_video_source_task, db_source.id, db, s3_client)
    return db_source


@app.patch('/v1/video-sources/{source_id}')
def update_video_source(
        source_id: int,
        source: schemas.VideoSourceUpdate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        s3_client = Depends(get_s3_client),
) -> schemas.VideoSource:
    db_source = crud.update_video_source(db, source_id, source)
    if db_source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    background_tasks.add_task(infer_video_source_task, db_source.id, db, s3_client)
    return db_source



@app.post('/v1/video-sources/{source_id}/tasks/infer')
def infer_video_source(
        source_id: int,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        s3_client = Depends(get_s3_client),
) -> schemas.VideoSource:
    db_source = crud.get_video_source(db, source_id)
    if db_source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    background_tasks.add_task(infer_video_source_task, db_source.id, db, s3_client)
    return db_source


@app.delete("/v1/video-sources/{source_id}")
def destroy_video_source(source_id: int, db: Session = Depends(get_db)) -> schemas.Result:
    ok = crud.destroy_video_source(db, source_id)
    if ok is None:
        raise HTTPException(status_code=404, detail="Source not found")
    return schemas.Result(ok=ok)


@app.get("/v1/video-sources/{source_id}/inferences")
def get_video_inferences(source_id: int, db: Session = Depends(get_db), since_t: float = 0, limit: int = 1000) -> list[schemas.Inference]:
    db_inferences = crud.get_inferences(db, schemas.SourceKind.Video, source_id, since_t, limit)
    # @PERF: SQLAlchemy and Pydantic are sorta slow here when getting initial list,
    #        but we manage by using t as cursor
    return db_inferences


@app.get("/v1/camera-sources")
def read_camera_sources(db: Session = Depends(get_db)) -> list[schemas.CameraSource]:
    db_sources = crud.get_camera_sources(db)
    return db_sources


@app.post('/v1/camera-sources')
def create_camera_source(source: schemas.CameraSourceCreate, db: Session = Depends(get_db)) -> schemas.CameraSource:
    mmtx_name = str(uuid.uuid4())
    db_source = crud.create_camera_source(db, source, mmtx_name)
    # background_tasks.add_task(infer_camera_source_task, db_source.id, db, s3_client)
    return db_source


@app.patch('/v1/camera-sources/{source_id}')
def update_camera_source(
        source_id: int,
        source: schemas.CameraSourceUpdate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        s3_client = Depends(get_s3_client),
) -> schemas.CameraSource:
    db_source = crud.update_camera_source(db, source_id, source)
    if db_source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    # background_tasks.add_task(infer_camera_source_task, db_source.id, db, s3_client)
    return db_source


@app.delete("/v1/camera-sources/{source_id}")
def destroy_camera_source(source_id: int, db: Session = Depends(get_db)) -> schemas.Result:
    ok = crud.destroy_camera_source(db, source_id)
    if ok is None:
        raise HTTPException(status_code=404, detail="Source not found")
    return schemas.Result(ok=ok)


@app.get("/v1/camera-sources/{source_id}/inferences")
def get_camera_inferences(source_id: int, db: Session = Depends(get_db), since_t: float = 0, limit: int = 1000) -> list[schemas.Inference]:
    db_inferences = crud.get_inferences(db, schemas.SourceKind.Video, source_id, since_t, limit)
    # @PERF: SQLAlchemy and Pydantic are sorta slow here when getting initial list,
    #        but we manage by using t as cursor
    return db_inferences
