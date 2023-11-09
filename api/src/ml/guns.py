from os import path

import cv2
from ultralytics import YOLO
import numpy as np

from src import schemas

class Runner:
    def __init__(self):
        self.model = YOLO('yolov8n-pose.pt')
        self.sub_model = YOLO(path.join(path.dirname(__file__), "./train9/weights/best.pt"))

    def infer(self, frame: np.ndarray, t_seconds: float) -> list[schemas.InferenceHitCreate]:
        res = self.model(frame, verbose=False)[0]

        fh, fw = frame.shape[0:2]

        hits: list[schemas.InferenceHitCreate] = []
        for idx in range(len(res)):
            keypoints = res.keypoints[idx]
            c1 = keypoints.conf[0].median().tolist()  # @NOTE: Median pose confidence works much better than label confidence
            if c1 < 0.8:
                continue

            box = res.boxes[idx]
            cx1, cy1, w1, h1 = box.xywh[0].tolist()
            hw1 = int(w1 * 1.4 / 2)
            hh1 = int(h1 * 1.2 / 2)
            x1 = max(0, int(cx1) - hw1)
            y1 = max(0, int(cy1) - hh1)
            sub_frame = frame[y1:y1 + hh1 * 2, x1:x1 + hw1 * 2]
            if sub_frame.shape[0] == 0 or sub_frame.shape[1] == 0:
                continue

            sub_res = self.sub_model(sub_frame, verbose=False)[0]
            for sub_box in sub_res.boxes:
                cx2, cy2, w2, h2 = sub_box.xywh[0].tolist()
                c2 = sub_box.conf[0].tolist()
                # @NOTE: x and y are expected to be centers of the bounding box
                hit = schemas.InferenceHitCreate(x=(x1 + cx2) / fw, y=(y1 + cy2) / fh, w=w2 / fw, h=h2 / fh, c=c2)
                hits.append(hit)

        return hits


# class Runner:
#     def __init__(self):
#         # self.model = YOLO('yolov8n-pose.pt').to("cpu")
#         # self.sub_model = YOLO(path.join(path.dirname(__file__), "./train9/weights/best.pt")).to('cpu')
#         self.hog = cv2.HOGDescriptor()
#         self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
#
#     # @WIP: Warn up the model
#
#     def infer(self, frame: np.ndarray, t_seconds: float) -> list[schemas.InferenceHitCreate]:
#         fr1 = cv2.resize(frame, (640, 360))
#         fr1 = cv2.cvtColor(fr1, cv2.COLOR_BGR2GRAY)
#         rects, weights = self.hog.detectMultiScale(fr1, padding=(4, 4), scale=1.02)
#
#         hits: list[schemas.InferenceHitCreate] = []
#         for (x, y, w, h), weight in zip(rects, weights):
#             hit = schemas.InferenceHitCreate(x=(x + w/2) / 640, y=(y + h/2) / 360, w=w / 640, h=h / 360, c=weight)
#             hits.append(hit)
#
#         return hits


# class Runner:
#
#     def __init__(self):
#         self.model = YOLO(path.join(path.dirname(__file__), "./train9/weights/best.pt")).to("cpu")
#
#     def infer(self, frame: np.ndarray, t_seconds: float) -> list[schemas.InferenceHitCreate]:
#         res = self.model(frame, verbose=False, max_det=1)  # @WIP: Resize?
#         res = res[0]
#
#         hits: list[schemas.InferenceHitCreate] = []
#         for box in res.boxes:
#             x, y, w, h = box.xywhn[0].tolist()
#             c = box.conf[0].tolist()
#             # @NOTE: x and y are expected to be centers of the bounding box
#             hit = schemas.InferenceHitCreate(x=x, y=y, w=w, h=h, c=c)
#             hits.append(hit)
#
#         return hits
