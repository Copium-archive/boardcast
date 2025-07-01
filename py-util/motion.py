import cv2
import numpy as np
import os
import sys
import json # Import the json module

def order_points(pts):
    """Sorts points in top-left, top-right, bottom-right, bottom-left order."""
    # sort the points based on their y-coordinates
    pts = sorted(pts, key=lambda x: x[1])
    # grab the top-most and bottom-most points
    top_pts = sorted(pts[:2], key=lambda x: x[0])  
    bottom_pts = sorted(pts[2:], key=lambda x: x[0])  
    # return the ordered coordinates
    return [top_pts[0], top_pts[1], bottom_pts[1], bottom_pts[0]]

def visualize_roi(video_path: str, roi_corners: list, output_dir: str = "test_result", 
                  output_filename: str = "motion_detection_region.png") -> bool:
    """
    Creates a visualization of the ROI overlay on the first frame of the video.
    
    Args:
        video_path (str): Path to the input video file.
        roi_corners (list): A list of four (x, y) tuples defining the region of interest.
        output_dir (str): Directory to save the visualization image.
        output_filename (str): Name of the output image file.
    
    Returns:
        bool: True if visualization was created successfully, False otherwise.
    """
    print("Generating ROI visualization...")
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Open the video to capture the first frame
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video file at {video_path} for visualization.")
        return False
    
    ret, first_frame = cap.read()
    cap.release()
    
    if not ret:
        print("Error: Could not read the first frame from the video for visualization.")
        return False
    
    # Draw the ROI polygon on the first frame
    roi_poly = np.array([order_points(roi_corners)], dtype=np.int32)
    cv2.polylines(first_frame, roi_poly, isClosed=True, color=(0, 255, 0), thickness=3)
    
    # Add a text label for clarity
    label_pos = (roi_poly[0][0][0], roi_poly[0][0][1] - 10)
    cv2.putText(first_frame, "Region of Interest", label_pos, cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    
    # Save the resulting image
    output_path = os.path.join(output_dir, output_filename)
    success = cv2.imwrite(output_path, first_frame)
    
    if success:
        print(f"Snapshot with ROI overlay saved to: {output_path}")
        return True
    else:
        print(f"Error: Failed to save visualization to {output_path}")
        return False

def detect_motion_segments(video_path: str, roi_corners: list, min_contour_area: int = 500) -> list:
    """
    Detects motion within a specified ROI in a video and returns timestamp segments.

    Args:
        video_path (str): Path to the input video file.
        roi_corners (list): A list of four (x, y) tuples defining the region of interest.
        min_contour_area (int): The minimum area for a contour to be considered motion.

    Returns:
        list: A list of [start_timestamp, end_timestamp] segments where motion was detected.
    """
    # 1. Initialization and Video Loading
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video file at {video_path}")
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        print(f"Error: Could not determine FPS for video {video_path}. Assuming 30 FPS.")
        fps = 30.0

    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_duration = total_frames / fps

    # 2. Create ROI Mask
    ordered_corners = np.array([order_points(roi_corners)], dtype=np.int32)
    mask = np.zeros((frame_height, frame_width), dtype=np.uint8)
    cv2.fillPoly(mask, ordered_corners, 255)

    # 3. Setup Background Subtractor
    backSub = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=50, detectShadows=False)

    # 4. Variables for Segment Tracking
    motion_segments = []
    motion_detected_flag = False
    start_time = 0
    frame_number = 0
    
    print("Processing video...")

    # 5. Main Processing Loop
    while True:
        ret, frame = cap.read()
        if not ret:
            break # End of video
            
        frame_number += 1
        current_time = frame_number / fps

        # Apply the ROI mask to the current frame
        roi_frame = cv2.bitwise_and(frame, frame, mask=mask)

        # Apply background subtractor to the ROI
        fg_mask = backSub.apply(roi_frame)

        # Clean up the foreground mask to reduce noise
        _, fg_mask = cv2.threshold(fg_mask, 250, 255, cv2.THRESH_BINARY)
        kernel = np.ones((5, 5), np.uint8)
        fg_mask = cv2.dilate(fg_mask, kernel, iterations=2)

        # Find contours of moving objects
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        is_motion_present = False
        for contour in contours:
            if cv2.contourArea(contour) > min_contour_area:
                is_motion_present = True
                break
        
        # 6. State Management for Logging Segments
        if is_motion_present and not motion_detected_flag:
            motion_detected_flag = True
            start_time = current_time
            
        elif not is_motion_present and motion_detected_flag:
            motion_detected_flag = False
            end_time = current_time
            motion_segments.append([round(start_time, 2), round(end_time, 2)])

    # 7. Finalization
    if motion_detected_flag:
        motion_segments.append([round(start_time, 2), round(video_duration, 2)])

    cap.release()
    print("Processing complete.")
    return motion_segments

if __name__ == "__main__":
    video_file = "sample_motion_detection.mp4"
    # Adjusted ROI to better fit the 1280x720 dummy video. Make sure these points
    # are within the frame dimensions of your video.
    region_of_interest_corners = [(5, 5), (1275, 5), (1275, 715), (5, 715)]
    
    # Check if video file exists
    if not os.path.exists(video_file):
        print(f"Error: '{video_file}' not found.")
        print("Please create a dummy video file named 'sample_motion_detection.mp4'.")
        print("You can use ffmpeg: ffmpeg -f lavfi -i testsrc=size=1280x720:rate=30 -t 10 -pix_fmt yuv420p sample_motion_detection.mp4")
        sys.exit(1)

    # Generate ROI visualization
    visualize_roi(video_file, region_of_interest_corners)

    # Run the motion detection function
    detected_segments = detect_motion_segments(
        video_path=video_file, 
        roi_corners=region_of_interest_corners
    )

    # --- MODIFIED FOR JSON OUTPUT ---

    # Create a dictionary to hold the results
    output_data = {
        "video_file": os.path.basename(video_file),
        "roi_corners_used": order_points(region_of_interest_corners),
        "motion_segments": []
    }

    # Structure the segments for clarity in the JSON output
    for start, end in detected_segments:
        output_data["motion_segments"].append({
            "start_time_seconds": start,
            "end_time_seconds": end,
            "duration_seconds": round(end - start, 2)
        })

    # Dump the dictionary to a JSON formatted string and print it.
    # The `indent=2` argument makes the output human-readable (pretty-printed).
    print("\n--- Motion Detection Results (JSON) ---")
    print(json.dumps(output_data, indent=2))