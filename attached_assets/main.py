import cv2
import numpy as np
import argparse
from ultralytics import YOLO
import requests
import googlemaps
from flask import Flask, request, jsonify
from geopy.distance import geodesic

# model = YOLOv8 nano version
model = YOLO("yolov8n.pt")

app = Flask(__name__)

ambulance_data = {}

RED = (0, 0, 255)
GREEN = (0, 255, 0)

traffic_light = RED

# Example traffic signal location (Times Square, New York)
TRAFFIC_SIGNAL_LOCATION = (40.758896, -73.985130)  

# Google Maps API (optional)
# GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"
# gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

@app.route("/update_gps", methods=["POST"])
def update_gps():
    global ambulance_data
    data = request.json
    ambulance_id = data["ambulance_id"]
    gps_location = (data["latitude"], data["longitude"])
    ambulance_data[ambulance_id] = gps_location
    return jsonify({"status": "updated", "ambulance_id": ambulance_id, "location": gps_location})

def is_ambulance_near(ambulance_gps):
    # Commented out Google Maps part if not needed
    """
    response = gmaps.distance_matrix(
        origins=[ambulance_gps],
        destinations=[TRAFFIC_SIGNAL_LOCATION],
        mode="driving"
    )
    distance_meters = response["rows"][0]["elements"][0]["distance"]["value"]
    return distance_meters < 200  
    """
    return False

def get_fastest_route(ambulance_gps, hospital_gps):
    # Commented out Google Maps part if not needed
    """
    directions = gmaps.directions(
        origin=ambulance_gps,
        destination=hospital_gps,
        mode="driving",
        alternatives=True  
    )
    return directions[0]["legs"][0]["duration"]["text"], directions[0]["legs"][0]["distance"]["text"]
    """
    return "5 mins", "2 km"

def change_traffic_light(ambulance_detected):
    global traffic_light
    traffic_light = GREEN if ambulance_detected else RED

def draw_traffic_light(frame):
    light_color = traffic_light
    cv2.circle(frame, (50, 50), 30, light_color, -1)

def detect_ambulance(frame):
    results = model(frame)
    ambulance_detected = False

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            if class_id == 5:  # 5 = bus (assuming ambulance as bus for now)
                ambulance_detected = True
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 3)
                cv2.putText(frame, "AMBULANCE", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
    return ambulance_detected

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Traffic Signal Control System - Ambulance Detection Only")
    parser.add_argument("-p", "--path", type=str, help="Path to video file (MP4)")
    parser.add_argument("-l", "--live", action="store_true", help="Use live webcam feed")
    args = parser.parse_args()

    if args.live:
        cap = cv2.VideoCapture(0)  # Live webcam
    elif args.path:
        cap = cv2.VideoCapture(args.path)  # Video file
    else:
        print("Error: Please provide either -p/--path for video or -l/--live for webcam.")
        exit(1)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        ambulance_detected = detect_ambulance(frame)

        if ambulance_detected:
            print("🚑 Ambulance detected! Turning traffic light GREEN.")
        else:
            print("No ambulance detected. Traffic light stays RED.")

        change_traffic_light(ambulance_detected)
        draw_traffic_light(frame)

        cv2.imshow("AmbuRouteAI - Ambulance Detection", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
