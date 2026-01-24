import cv2
import base64
import json
import argparse
import os
import websocket
from ultralytics import YOLO
import time

# CONFIG
import numpy as np

# CONFIG
WS_URL = "ws://localhost:8081"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "best.pt")

model = None

class SimpleTracker:
    def __init__(self, max_missed=30, dist_thresh=100):
        self.next_id = 1
        self.objects = {} # id -> rect (x1, y1, x2, y2)
        self.missed = {}  # id -> missed_count
        self.max_missed = max_missed
        self.dist_thresh = dist_thresh

    def update(self, rects):
        # rects: list of (x1,y1,x2,y2)
        if len(rects) == 0:
            for oid in list(self.missed.keys()):
                self.missed[oid] += 1
                if self.missed[oid] > self.max_missed:
                    self.deregister(oid)
            return self.objects

        input_centroids = np.zeros((len(rects), 2), dtype="int")
        for (i, (startX, startY, endX, endY)) in enumerate(rects):
            cX = int((startX + endX) / 2.0)
            cY = int((startY + endY) / 2.0)
            input_centroids[i] = (cX, cY)

        if len(self.objects) == 0:
            for i in range(0, len(input_centroids)):
                self.register(rects[i])
        else:
            objectIDs = list(self.objects.keys())
            objectRects = list(self.objects.values())
            objectCentroids = []
            for (x1, y1, x2, y2) in objectRects:
                objectCentroids.append((int((x1 + x2) / 2.0), int((y1 + y2) / 2.0)))

            D = np.linalg.norm(np.array(objectCentroids) - input_centroids[:, np.newaxis], axis=2)
            rows = D.min(axis=1).argsort()
            cols = D.argmin(axis=1)[rows]

            usedRows = set()
            usedCols = set()

            for (row, col) in zip(rows, cols):
                if row in usedRows or col in usedCols:
                    continue

                if D[row, col] > self.dist_thresh:
                    continue

                objectID = objectIDs[col]
                self.objects[objectID] = rects[row]
                self.missed[objectID] = 0

                usedRows.add(row)
                usedCols.add(col)

            # Register new
            for i in range(len(input_centroids)):
                if i not in usedRows:
                    self.register(rects[i])

            # Deregister missing
            for col in range(len(objectIDs)):
                if col not in usedCols:
                    oid = objectIDs[col]
                    self.missed[oid] += 1
                    if self.missed[oid] > self.max_missed:
                        self.deregister(oid)

        return self.objects

    def register(self, rect):
        self.objects[self.next_id] = rect
        self.missed[self.next_id] = 0
        self.next_id += 1

    def deregister(self, objectID):
        del self.objects[objectID]
        del self.missed[objectID]

def point_in_polygon(point, polygon):
    # point: (x, y)
    # polygon: numpy array of [x,y] points
    return cv2.pointPolygonTest(polygon, (float(point[0]), float(point[1])), False) >= 0

def start_yolo_stream(source, stream_id, zones_json="[]"):
    global model
    if model is None:
        print(f"Loading YOLO model from {MODEL_PATH}...")
        model = YOLO(MODEL_PATH)

    # Load zones
    zones = []
    try:
        zones_data = json.loads(zones_json)
        # Parse [[x,y],...] format
        for z in zones_data:
            if "poly" in z and len(z["poly"]) > 2:
                # Ensure it's a list of [x,y] pairs and convert to numpy array
                poly_np = np.array(z["poly"], dtype=np.int32).reshape((-1, 1, 2))
                zones.append({
                    "name": z["name"],
                    "poly": poly_np,
                    "counted_ids": set()
                })
        print(f"Loaded {len(zones)} zones for counting.")
    except Exception as e:
        print(f"Error loading zones: {e}")

    tracker = SimpleTracker(max_missed=30, dist_thresh=100)
    
    print(f"Starting persistent engine for {stream_id} with source: {source}")
    
    # Expand source to int if it's a digit (for webcam index)
    if source.isdigit():
        source = int(source)

    while True:  # Outer loop for overall process persistence
        ws = None
        try:
            # 1. Connect to WebSocket
            print(f"Connecting to WebSocket at {WS_URL}...")
            ws = websocket.WebSocket()
            ws.connect(WS_URL)
            print("Connected to WebSocket")

            # 2. Open Video Source
            cap = cv2.VideoCapture(source)
            if not cap.isOpened():
                print(f"Failed to open source: {source}. Retrying in 5 seconds...")
                time.sleep(5)
                continue

            print(f"Source {source} opened successfully")

            frame_count = 0
            while True:  # Inner loop for frame processing
                ret, frame = cap.read()
                if not ret:
                    print("Cannot read frame. Source might be disconnected. Retrying...")
                    # Try to release and re-open the capture
                    cap.release()
                    time.sleep(2)
                    cap = cv2.VideoCapture(source)
                    if not cap.isOpened():
                        break # Break inner loop to restart everything if source is truly gone
                    continue

                frame_count += 1
                # Removed frame skipping to ensure all bags are caught

                # OPTIMIZATION: Resize to 640 width (maintain aspect ratio)
                h, w = frame.shape[:2]
                if w > 640:
                    scale = 640 / w
                    new_h = int(h * scale)
                    frame = cv2.resize(frame, (640, new_h))

                # Run YOLO detection with optimized parameters to prevent double counting
                # Using model.predict() with specific conf, iou, and agnostic_nms
                results = model.predict(
                    frame, 
                    verbose=False, 
                    conf=0.35, 
                    iou=0.4, 
                    agnostic_nms=True
                )[0]
                rects = []
                
                # Draw detections
                for box in results.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    class_name = model.names.get(cls_id, f"Class {cls_id}")
                    rects.append((x1, y1, x2, y2))
                    
                    # Color based on confidence
                    if conf > 0.7:
                        color = (0, 255, 0)
                    elif conf > 0.5:
                        color = (0, 255, 255)
                    else:
                        color = (0, 165, 255)
                    
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    label = f"{class_name} {conf:.0%}"
                    (label_w, label_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(frame, (x1, y1 - label_h - 10), (x1 + label_w + 10, y1), color, -1)
                    cv2.putText(frame, label, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

                # Update Tracker
                objects = tracker.update(rects)

                # Check Zones
                for (objectID, rect) in objects.items():
                    x1, y1, x2, y2 = rect
                    # Use lower-center point for zone detection (better for belt/floor zones)
                    track_point = (int((x1 + x2) / 2.0), y2)

                    # Check entry
                    for zone in zones:
                        if point_in_polygon(track_point, zone["poly"]):
                            if objectID not in zone["counted_ids"]:
                                zone["counted_ids"].add(objectID)
                                print(f"Bag ID {objectID} entered zone {zone['name']}")
                
                # Draw Zones and Counts
                zone_counts = {}
                for zone in zones:
                    cv2.polylines(frame, [zone["poly"]], True, (255, 0, 0), 2)
                    count_text = f"{zone['name']}: {len(zone['counted_ids'])}"
                    # Compute centroid of zone for text
                    M = cv2.moments(zone["poly"])
                    if M["m00"] != 0:
                        cX = int(M["m10"] / M["m00"])
                        cY = int(M["m01"] / M["m00"])
                        cv2.putText(frame, str(len(zone['counted_ids'])), (cX, cY),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
                    zone_counts[zone["name"]] = len(zone["counted_ids"])

                # Encode to JPEG with lower quality for speed
                success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
                if not success:
                    continue

                jpg_base64 = base64.b64encode(buffer).decode("utf-8")
                
                if jpg_base64.strip().startswith("{"):
                    print(f"CRITICAL ERROR: Generated base64 starts with {{! len={len(jpg_base64)}")
                    print(jpg_base64[:100])

                # Create JSON payload
                # User request: Total count should be addition of bags in all zones
                total_zone_sum = sum(len(z["counted_ids"]) for z in zones)

                payload = {
                    "streamId": stream_id,
                    "image": jpg_base64,
                    "count": total_zone_sum,
                    "zone_counts": zone_counts,
                    "timestamp": time.time()
                }

                # Send frame to Node WebSocket
                try:
                    ws.send(json.dumps(payload))
                except Exception as e:
                    print(f"WebSocket send error: {e}. Attempting to reconnect...")
                    break # Break inner loop to reconnect WebSocket
            
            cap.release()
        except Exception as e:
            print(f"Process Error: {e}. Restarting in 5 seconds...")
            time.sleep(5)
        finally:
            if ws:
                try:
                    ws.close()
                except:
                    pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=str, required=True, help="RTSP URL or Video File Path")
    parser.add_argument("--streamId", type=str, required=True, help="Unique ID for this stream session")
    parser.add_argument("--zones", type=str, default="[]", help="JSON string of zones")
    args = parser.parse_args()

    start_yolo_stream(args.source, args.streamId, args.zones)
