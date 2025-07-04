import cv2
import numpy as np
import os
import json
import argparse
import sys

def chessboard_segmentation(corners):
    """Process corner points and generate all chess square coordinates in one go."""
    if corners is None or len(corners) != 4:
        raise ValueError("You must select exactly 4 corners first")
    
    corners = sorted(corners, key=lambda x: x[1])
    top_pts = sorted(corners[:2], key=lambda x: x[0])
    bottom_pts = sorted(corners[2:], key=lambda x: x[0])
    ordered_corners = [top_pts[0], top_pts[1], bottom_pts[1], bottom_pts[0]]
    
    square_size = 1000
    corners_array = np.array(ordered_corners, dtype=np.float32)
    board_size = 8 * square_size
    dst_points = np.array([
        [0, 0],                      # top-left
        [board_size, 0],             # top-right
        [board_size, board_size],    # bottom-right
        [0, board_size]              # bottom-left
    ], dtype=np.float32)
    
    perspective_matrix = cv2.getPerspectiveTransform(corners_array, dst_points)
    inverse_matrix = cv2.invert(perspective_matrix)[1]
    
    # Generate all chess squares
    squares = {
        "top-left": [],
        "top-right": [],
        "bottom-right": [],
        "bottom-left": []
    }
    
    for row in range(8):
        for col in range(8):
            min_x = col * square_size
            min_y = row * square_size 
            
            board_corners = [
                (min_x, min_y),                                    # top-left
                (min_x + square_size, min_y),                     # top-right
                (min_x + square_size, min_y + square_size),       # bottom-right
                (min_x, min_y + square_size)                      # bottom-left
            ]
            
            image_corners = []
            for point in board_corners:
                point_array = np.array([[point[0], point[1]]], dtype=np.float32)
                warped_point = cv2.perspectiveTransform(point_array.reshape(-1, 1, 2), inverse_matrix)
                wx, wy = warped_point[0][0]
                image_corners.append((int(wx), int(wy)))
            
            squares["top-left"].append(list(image_corners[0]))
            squares["top-right"].append(list(image_corners[1]))
            squares["bottom-right"].append(list(image_corners[2]))
            squares["bottom-left"].append(list(image_corners[3]))
    
    print(json.dumps(squares))

def parse_corners(corner_strings):
    """Parse corner coordinates from command line arguments."""
    corners = []
    for corner_str in corner_strings:
        try:
            # Remove parentheses and split by comma
            coords = corner_str.strip('()').split(',')
            if len(coords) != 2:
                raise ValueError(f"Invalid corner format: {corner_str}")
            x, y = int(coords[0].strip()), int(coords[1].strip())
            corners.append((x, y))
        except ValueError as e:
            raise ValueError(f"Error parsing corner '{corner_str}': {e}")
    return corners

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Chess board segmentation with perspective correction')
    parser.add_argument('corners', nargs=4, help='Four corner points in format: x1,y1 x2,y2 x3,y3 x4,y4')
    args = parser.parse_args()
    
    try:
        points = parse_corners(args.corners)
        if len(points) != 4:
            raise ValueError("Exactly 4 corner points are required")
        chessboard_segmentation(points)
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)