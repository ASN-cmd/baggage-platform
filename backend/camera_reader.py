import requests
import cv2
import time

BACKEND_URL = "http://localhost:3000"   # your backend

def get_camera_url(camera_id):
    try:
        res = requests.get(f"{BACKEND_URL}/cameras/{camera_id}")
        data = res.json()
        return data["rtspUrl"]
    except Exception as e:
        print("❌ Error fetching camera URL:", e)
        return None

def start_camera(camera_id):
    url = get_camera_url(camera_id)
    if not url:
        print("❌ Camera URL not found in backend")
        return

    print("📡 Opening camera stream:", url)

    cap = cv2.VideoCapture(url)

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Frame not received. Retrying in 2 seconds...")
            time.sleep(2)
            continue

        cv2.imshow("Live Camera Feed", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

# Run camera stream for camera ID = 1
start_camera(camera_id=1)
