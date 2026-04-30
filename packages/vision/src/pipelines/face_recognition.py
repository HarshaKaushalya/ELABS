import cv2
import logging

logger = logging.getLogger(__name__)

def recognize_faces(video_path: str) -> list[str]:
    """
    Detect faces in a video and map them to student IDs.
    Uses OpenCV Haar Cascades for face detection.
    """
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    cap = cv2.VideoCapture(video_path)
    
    detected_students = set()
    frame_count = 0
    
    # Mock database mapping generic face signatures to student IDs
    mock_student_db = ["EG/2022/5401", "EG/2022/5402", "EG/2022/5403"]
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_count += 1
        # Process every 30th frame to save CPU
        if frame_count % 30 != 0:
            continue
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        for i, (x, y, w, h) in enumerate(faces):
            # In a real scenario, we'd extract embeddings here and match against the DB.
            # For this MVP, we map the first few detected faces to our mock DB.
            student_id = mock_student_db[i % len(mock_student_db)]
            detected_students.add(student_id)
            
    cap.release()
    logger.info(f"Detected {len(detected_students)} students in video.")
    
    return list(detected_students)