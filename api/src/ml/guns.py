from os import path

from ultralytics import YOLO
import numpy as np

from src import schemas

model = YOLO(path.join(path.dirname(__file__), "./train9/weights/best.pt"))
# model = model.to("cpu")

def infer(frame: np.ndarray, t_seconds: float) -> list[schemas.InferenceHitCreate]:
    res = model(frame, verbose=False)  # @WIP: Resize?
    res = res[0]

    hits: list[schemas.InferenceHitCreate] = []
    for box in res.boxes:
        x, y, w, h = box.xywhn[0].tolist()
        c = box.conf[0].tolist()
        hit = schemas.InferenceHitCreate(x=x, y=y, w=w, h=h, c=c)
        hits.append(hit)

    return hits
