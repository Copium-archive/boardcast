import os
import cv2
import numpy as np
import json
import argparse
import sys

def save_image_to_test_result(filename, image):
    """Save an image to the test_result directory."""
    output_dir = 'test_result'
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, filename)
    cv2.imwrite(output_path, image)

def parse_corners(corner_args):
    """
    Parse corner points from command line arguments.
    
    Args:
        corner_args (list): List of strings in format 'x,y'
        
    Returns:
        list: List of (x, y) tuples
    """
    points = []
    for corner in corner_args:
        try:
            x, y = corner.split(',')
            points.append((int(x), int(y)))
        except ValueError:
            raise ValueError(f"Invalid corner format: {corner}. Expected format: x,y")
    return points

def order_points(pts):
    y_sorted = sorted(pts, key=lambda x: x[1])
    top_pts = sorted(y_sorted[:2], key=lambda x: x[0])
    bottom_pts = sorted(y_sorted[2:], key=lambda x: x[0], reverse=True)
    return [top_pts[0], top_pts[1], bottom_pts[0], bottom_pts[1]]

def create_roi_mask(frame_shape, roi_corners):
    mask = np.zeros((frame_shape[0], frame_shape[1]), dtype=np.uint8)
    ordered_points = order_points(roi_corners)
    pts = np.array(ordered_points, np.int32).reshape((-1, 1, 2))
    cv2.fillPoly(mask, [pts], 255)
    return mask

def visualize_roi(frame, roi_corners, save_path=None):
    """
    Visualize the ROI on a frame and optionally save it.
    
    Args:
        frame (numpy.ndarray): Input frame
        roi_corners (list): List of 4 (x, y) tuples defining ROI corners
        save_path (str, optional): Path to save the visualization
        
    Returns:
        numpy.ndarray: Frame with ROI visualization
    """
    frame_with_roi = frame.copy()
    ordered_points = order_points(roi_corners)
    pts = np.array(ordered_points, np.int32).reshape((-1, 1, 2))
    cv2.polylines(frame_with_roi, [pts], isClosed=True, color=(0, 255, 0), thickness=3)
    
    if save_path:
        try:
            save_image_to_test_result(save_path, frame_with_roi)
        except Exception as e:
            print(f"Warning: Could not save ROI visualization. Error: {e}")
    
    return frame_with_roi

def get_video_properties(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        print("Warning: Could not determine video FPS. Using 30 as default.")
        fps = 30
    
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = total_frames / fps
    
    cap.release()
    
    return {
        'fps': fps,
        'total_frames': total_frames,
        'duration': duration
    }

def detect_motion_in_video(video_path, roi_corners, motion_threshold=500):
    """
    Detect motion in a video within a specified region of interest.
    
    Args:
        video_path (str): Path to the video file
        roi_corners (list): List of 4 (x, y) tuples defining ROI corners
        motion_threshold (int): Threshold for motion detection
        
    Returns:
        list: List of (start_time, end_time) tuples for motion segments
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")
    
    # Get video properties
    video_props = get_video_properties(video_path)
    fps = video_props['fps']
    
    # Read first frame to get dimensions and create mask
    ret, first_frame = cap.read()
    if not ret:
        cap.release()
        raise ValueError("Could not read the first frame of the video")
    
    # Create ROI mask
    mask = create_roi_mask(first_frame.shape, roi_corners)
    
    # Visualize and save ROI
    visualize_roi(first_frame, roi_corners, 'motion_detection_ROI.png')
    
    # Reset to beginning
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    
    # Initialize motion detection variables
    prev_frame = None
    frame_count = 0
    segments = []
    current_segment = None
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Get timestamp
        timestamp = frame_count / fps
        frame_count += 1
        
        # Process frame for motion detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        masked_gray = cv2.bitwise_and(gray, gray, mask=mask)
        blurred = cv2.GaussianBlur(masked_gray, (21, 21), 0)
        
        if prev_frame is None:
            prev_frame = blurred
            continue
        
        # Calculate motion score
        frame_diff = cv2.absdiff(prev_frame, blurred)
        thresh = cv2.threshold(frame_diff, 25, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)
        motion_score = np.sum(thresh) / 255
        
        # Check for motion
        if motion_score > motion_threshold:
            if current_segment is None:
                current_segment = (timestamp, None)
        else:
            if current_segment is not None:
                current_segment = (current_segment[0], timestamp)
                segments.append(current_segment)
                current_segment = None
        
        prev_frame = blurred
    
    # Handle ongoing segment at end of video
    if current_segment is not None:
        end_time = frame_count / fps
        current_segment = (current_segment[0], end_time)
        segments.append(current_segment)
    
    cap.release()
    return segments

def add_padding_to_segments(segments, padding_seconds, video_duration):
    """
    Add padding to motion segments.
    
    Args:
        segments (list): List of (start, end) tuples
        padding_seconds (float): Seconds to add before and after each segment
        video_duration (float): Total duration of the video
        
    Returns:
        list: List of padded segments
    """
    if not segments:
        return []
    
    padded_segments = []
    for start, end in segments:
        padded_start = max(0, start - padding_seconds)
        padded_end = min(end + padding_seconds, video_duration)
        padded_segments.append((padded_start, padded_end))
    
    return padded_segments

def merge_overlapping_segments(segments):
    """
    Merge overlapping or touching segments.
    
    Args:
        segments (list): List of (start, end) tuples
        
    Returns:
        list: List of merged segments
    """
    if not segments:
        return []
    
    # Sort by start time
    sorted_segments = sorted(segments, key=lambda x: x[0])
    
    merged_segments = []
    current_start, current_end = sorted_segments[0]
    
    for start, end in sorted_segments[1:]:
        if start <= current_end:  # Overlapping or touching
            current_end = max(current_end, end)
        else:
            merged_segments.append((current_start, current_end))
            current_start, current_end = start, end
    
    merged_segments.append((current_start, current_end))
    return merged_segments

def process_motion_segments(segments, padding_seconds=0, video_duration=None):
    if not segments:
        return []
    
    processed_segments = segments
    
    if padding_seconds > 0:
        if video_duration is None:
            raise ValueError("video_duration is required when padding_seconds > 0")
        processed_segments = add_padding_to_segments(processed_segments, padding_seconds, video_duration)
    
    processed_segments = merge_overlapping_segments(processed_segments)
    return processed_segments

def format_segments_as_json(segments):
    """
    Format segments as JSON string.
    
    Args:
        segments (list): List of (start, end) tuples
        
    Returns:
        str: JSON formatted string
    """
    video_segments = {"segments": segments}
    return json.dumps(video_segments, indent=4)

def print_motion_results(segments, padding_seconds=0, video_duration=None):
    """
    Print motion detection results in JSON format.
    
    Args:
        segments (list): List of (start, end) tuples
        padding_seconds (float): Seconds to add as padding
        video_duration (float): Total video duration
    """
    if padding_seconds > 0 and video_duration is not None:
        segments = process_motion_segments(segments, padding_seconds, video_duration)
    
    if not segments:
        print("No motion detected in the selected region.")
        return
    
    json_output = format_segments_as_json(segments)
    print(json_output)

# Main function using the utilities
def main():
    parser = argparse.ArgumentParser(description='Motion detection in video with ROI')
    parser.add_argument('corners', nargs=4, help='Four corner points in format: x1,y1 x2,y2 x3,y3 x4,y4')
    parser.add_argument('--video', default='sample_motion_detection.mp4', help='Input video path (default: sample_motion_detection.mp4)')
    parser.add_argument('--threshold', type=int, default=500, help='Motion detection threshold (default: 500)')
    parser.add_argument('--padding', type=float, default=1.0, help='Padding seconds around motion segments (default: 1.0)')
    
    args = parser.parse_args()
    
    try:
        # Parse corner points from command line arguments
        roi_corners = parse_corners(args.corners)
        
        if len(roi_corners) != 4:
            raise ValueError("Exactly 4 corner points are required")
        
        # Determine video path
        if os.path.isabs(args.video):
            video_path = args.video
        else:
            try:
                script_dir = os.path.dirname(os.path.abspath(__file__))
            except NameError:
                script_dir = os.getcwd()
            video_path = os.path.join(script_dir, args.video)
        
        # Get video properties and detect motion
        video_props = get_video_properties(video_path)
        motion_segments = detect_motion_in_video(video_path, roi_corners, motion_threshold=args.threshold)
        print_motion_results(motion_segments, padding_seconds=args.padding, video_duration=video_props['duration'])
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()