import os
import cv2
import numpy as np
import datetime

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bg_path = os.path.join(root, "packages", "web", "public", "labs", "lab3-electronics-measurement.jpg")
    
    out_web_dir = os.path.join(root, "packages", "web", "public", "samples")
    os.makedirs(out_web_dir, exist_ok=True)
    out_web_file = os.path.join(out_web_dir, "deie_lab_sample.mp4")

    out_vis_dir = os.path.join(root, "packages", "vision", "src", "storage", "uploads")
    os.makedirs(out_vis_dir, exist_ok=True)
    out_vis_file = os.path.join(out_vis_dir, "2d21a1ca06eb46838001cb4dfdeb9bd4_14906965_2560_1440_30fps.mp4")
    out_vis_file2 = os.path.join(out_vis_dir, "sample_lab_video.mp4")

    W, H = 1280, 720
    fps = 30
    duration_sec = 8
    total_frames = fps * duration_sec

    if os.path.exists(bg_path):
        base_bg = cv2.imread(bg_path)
        base_bg = cv2.resize(base_bg, (W, H))
    else:
        # Fallback dark lab theme
        base_bg = np.zeros((H, W, 3), dtype=np.uint8)
        base_bg[:] = (20, 24, 30)
        cv2.putText(base_bg, "DEIE LAB 03 - ELECTRONICS & MEASUREMENT", (100, 360),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200, 200, 200), 2)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(out_web_file, fourcc, fps, (W, H))

    for frame_idx in range(total_frames):
        frame = base_bg.copy()

        # Slight CCTV grain / noise
        noise = np.random.randint(-5, 6, frame.shape, dtype=np.int16)
        frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # Animated student 1 (bench sitting/soldering)
        # Bounding box simulation: (340, 280, 160, 260) with small swaying
        s1_x = int(340 + 4 * np.sin(frame_idx / 15.0))
        s1_y = int(280 + 2 * np.cos(frame_idx / 20.0))
        # Draw translucent silhouette or marker
        cv2.ellipse(frame, (s1_x + 80, s1_y + 40), (28, 36), 0, 0, 360, (60, 80, 100), -1) # Head
        cv2.rectangle(frame, (s1_x + 35, s1_y + 76), (s1_x + 125, s1_y + 240), (50, 70, 90), -1) # Body

        # Animated student 2 (walking across aisle)
        progress = (frame_idx % total_frames) / float(total_frames)
        s2_x = int(680 + progress * 260)
        s2_y = int(320 + 3 * np.sin(frame_idx / 8.0))
        cv2.ellipse(frame, (s2_x + 60, s2_y + 35), (26, 34), 0, 0, 360, (70, 90, 120), -1) # Head
        cv2.rectangle(frame, (s2_x + 25, s2_y + 70), (s2_x + 95, s2_y + 250), (60, 80, 110), -1) # Body

        # CCTV OSD Banner Header
        rec_dot = (0, 0, 255) if (frame_idx // 15) % 2 == 0 else (100, 100, 100)
        cv2.circle(frame, (40, 35), 8, rec_dot, -1)
        cv2.putText(frame, "REC", (58, 41), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (240, 240, 240), 2)

        cam_text = "CAM 03: DEIE ELECTRONICS & MEASUREMENT LAB (BENCH 1-6)"
        cv2.putText(frame, cam_text, (130, 41), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (200, 240, 255), 2)

        # Timestamp
        now = datetime.datetime.now() + datetime.timedelta(seconds=frame_idx / float(fps))
        time_str = now.strftime("%Y-%m-%d  %H:%M:%S")
        cv2.putText(frame, time_str, (W - 320, 41), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (240, 240, 240), 2)

        # Footer OSD
        cv2.putText(frame, "FACULTY OF ENGINEERING - UNIVERSITY OF RUHUNA", (40, H - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (160, 180, 200), 1)
        cv2.putText(frame, "CH 03 | 1080P | 30 FPS | AUTO-GAIN: ON", (W - 380, H - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, (160, 180, 200), 1)

        writer.write(frame)

    writer.release()
    print(f"Generated sample video: {out_web_file} ({os.path.getsize(out_web_file)} bytes)")

    # Copy to vision storage uploads
    import shutil
    shutil.copyfile(out_web_file, out_vis_file)
    shutil.copyfile(out_web_file, out_vis_file2)
    print(f"Copied to vision storage: {out_vis_file} ({os.path.getsize(out_vis_file)} bytes)")

if __name__ == "__main__":
    main()
