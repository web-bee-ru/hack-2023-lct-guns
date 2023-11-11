from os import path

import cv2
from ultralytics import YOLO
import numpy as np

from src import schemas

# @NOTE: Human pose detector + gun detector
class Runner:
    def __init__(self):
        self.model = YOLO('yolov8n-pose.pt').to('cuda')
        self.sub_model = YOLO(path.join(path.dirname(__file__), "./train9/weights/best.pt")).to('cuda')

    def infer(self, frame: np.ndarray, t_seconds: float) -> list[schemas.InferenceHitCreate]:
        res = self.model.track(frame, persist=True, verbose=False)[0]

        fh, fw = frame.shape[0:2]

        hits: list[schemas.InferenceHitCreate] = []
        for idx in range(len(res)):
            keypoints = res.keypoints[idx]
            c1 = keypoints.conf[0].median().tolist()  # @NOTE: Median pose confidence works much better than label confidence
            if c1 < 0.7:
                continue

            box = res.boxes[idx]
            if box.id is None:
                continue
            track_id = int(box.id[0].tolist())
            xywh = box.xywh[0]  # @NOTE: xy is center of bbox
            xy, wh = xywh[0:2], xywh[2:4]

            wh[0] *= 1.6
            wh[1] *= 1.2
            xy = xy.round()
            wh = (wh / 2).round() * 2
            lt = xy - wh / 2
            rb = xy + wh / 2

            l = int(max(0, lt[0]))
            t = int(max(0, lt[1]))
            r = int(min(rb[0], fw - 1))
            b = int(min(rb[1], fh - 1))
            if (t >= b) or (l >= r):
                continue

            sub_frame = frame[t:b, l:r]
            if sub_frame.shape[0] == 0 or sub_frame.shape[1] == 0:
                continue
            sub_res = self.sub_model(sub_frame, verbose=False)[0]
            for sub_box in sub_res.boxes:
                cx2, cy2, w2, h2 = sub_box.xywh[0].tolist()
                c2 = sub_box.conf[0].tolist()
                # @NOTE: x and y are expected to be centers of the bounding box
                hit = schemas.InferenceHitCreate(x=(l + cx2) / fw, y=(t + cy2) / fh, w=w2 / fw, h=h2 / fh, c=c2, track_id=track_id)
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
