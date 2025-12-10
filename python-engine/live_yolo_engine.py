import cv2
import base64
import requests
import websocket
from ultralytics import YOLO

# CONFIG
BACKEND = "http://localhost:3000"
WS_URL = "ws://localhost:8081"

# Connect to WebSocket
ws = websocket.WebSocket()
ws.connect(WS_URL)
print("Connected to WebSocket")

# Load YOLO model
model = YOLO("best.pt")  # your trained model


def get_camera_url(camera_id):
    data = requests.get(f"{BACKEND}/cameras/{camera_id}").json()
    return data["rtspUrl"]   # your backend uses rtspUrl key


def start_yolo_stream(camera_id):
    cam_url = get_camera_url(camera_id)
    print("Opening Camera:", cam_url)

    cap = cv2.VideoCapture(cam_url)

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Cannot read frame")
            continue

        # Run YOLO detection
        results = model(frame)[0]
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0]
            cv2.rectangle(
                frame,
                (int(x1), int(y1)),
                (int(x2), int(y2)),
                (0, 255, 0), 2
            )

        # Encode to JPEG
        success, buffer = cv2.imencode(".jpg", frame)
        if not success:
            continue

        jpg_base64 = base64.b64encode(buffer).decode("utf-8")

        # Send frame to Node WebSocket
        ws.send(jpg_base64)


# Start streaming for camera ID 5
start_yolo_stream(camera_id=5)
