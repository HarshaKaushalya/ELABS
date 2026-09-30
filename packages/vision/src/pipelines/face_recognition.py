import cv2
import logging
import time
from pathlib import Path
from deepface import DeepFace

logger = logging.getLogger(__name__)

SNAPSHOTS_DIR = Path(__file__).parent.parent / "storage" / "snapshots"
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)

def recognize_faces(video_path: str) -> list[str]:
    """
    Detect faces in a video and map them to student IDs.
    Upgraded to use DeepFace with MediaPipe backend for high efficiency and accuracy.
    Saves snapshots of detected faces for later experiments.
    """
    cap = cv2.VideoCapture(video_path)
    
    detected_students = set()
    frame_count = 0
    
    # Mock database mapping for MVP (In production, use DeepFace.find with a ChromaDB of embeddings)
    mock_student_db = ["EG/2022/5401", "EG/2022/5402", "EG/2022/5403"]
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_count += 1
        # Sample every 30th frame (1 second at 30fps) for efficiency
        if frame_count % 30 != 0:
            continue
            
        try:
            # extract_faces uses mediapipe for rapid CPU-based face detection
            faces = DeepFace.extract_faces(
                img_path=frame, 
                detector_backend='mediapipe', 
                enforce_detection=False
            )
            
            for i, face_obj in enumerate(faces):
                if face_obj['confidence'] < 0.5:
                    continue
                    
                # Extract the facial area
                facial_area = face_obj['facial_area']
                x, y, w, h = facial_area['x'], facial_area['y'], facial_area['w'], facial_area['h']
                
                # Crop the face for the snapshot
                face_crop = frame[max(0, y):y+h, max(0, x):x+w]
                
                # Mock embedding matching
                student_id = mock_student_db[i % len(mock_student_db)]
                detected_students.add(student_id)
                
                # Save snapshot for dashboard / later experiments
                safe_id = student_id.replace("/", "_")
                timestamp = int(time.time() * 1000)
                snapshot_filename = f"{safe_id}_{timestamp}.jpg"
                snapshot_path = SNAPSHOTS_DIR / snapshot_filename
                
                if face_crop.size > 0:
                    cv2.imwrite(str(snapshot_path), face_crop)
                    logger.info(f"Saved face snapshot: {snapshot_filename}")
                    
        except Exception as e:
            logger.warning(f"DeepFace extraction failed on frame {frame_count}: {e}")
            
    cap.release()
    logger.info(f"Detected {len(detected_students)} students in video.")
    
    return list(detected_students)