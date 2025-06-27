import cv2
import numpy as np
import os
import json

square_size = 1000

def get_matrix(corners):
    """Calculate the perspective transform matrix."""
    if corners is None or len(corners) != 4:
        raise ValueError("You must select exactly 4 corners first")
    
    # Ensure corners are in the correct order: top-left, top-right, bottom-right, bottom-left
    corners = np.array(corners, dtype=np.float32)
    
    board_size = 8 * square_size
    dst_points = np.array([
        [0, 0],                      # top-left
        [board_size, 0],             # top-right
        [board_size, board_size],    # bottom-right
        [0, board_size]              # bottom-left
    ], dtype=np.float32)
    
    # Fix: correct parameter order - source points first, then destination points
    return cv2.getPerspectiveTransform(corners, dst_points)

def apply_perspective_transform(corners, perspective_matrix):
    """Transform points from original image to corrected board coordinates."""
    result = []
    for point in corners:
        point_array = np.array([[point[0], point[1]]], dtype=np.float32)
        # Apply the perspective transform
        warped_point = cv2.perspectiveTransform(point_array.reshape(-1, 1, 2), perspective_matrix)
        wx, wy = warped_point[0][0]
        result.append((int(wx), int(wy)))
    return result

def apply_inverse_perspective_transform(corners, perspective_matrix):
    """Transform points from board coordinates back to original image coordinates."""
    # Use the inverse matrix to go from board coordinates to image coordinates
    inverse_matrix = cv2.invert(perspective_matrix)[1]
    result = []
    for point in corners:
        point_array = np.array([[point[0], point[1]]], dtype=np.float32)
        warped_point = cv2.perspectiveTransform(point_array.reshape(-1, 1, 2), inverse_matrix)
        wx, wy = warped_point[0][0]
        result.append((int(wx), int(wy)))
    return result

def chessboard_segmentation(perspective_matrix):
    """Generate all chess squares, mark them, and save their corners to a JSON file."""
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
            # Board coordinates for this square
            board_corners = [
                (min_x, min_y),                                    # top-left
                (min_x + square_size, min_y),                     # top-right
                (min_x + square_size, min_y + square_size),       # bottom-right
                (min_x, min_y + square_size)                      # bottom-left
            ]
            
            # Transform back to original image coordinates
            image_corners = apply_inverse_perspective_transform(board_corners, perspective_matrix)
            
            # Save corners to the corresponding lists
            squares["top-left"].append(list(image_corners[0]))
            squares["top-right"].append(list(image_corners[1]))
            squares["bottom-right"].append(list(image_corners[2]))
            squares["bottom-left"].append(list(image_corners[3]))
            
            output_filename = f'square_{row}_{col}.png'
            mark_and_label_points('chess_match.png', image_corners, output_filename=output_filename)

    # Save all squares to JSON
    print(json.dumps(squares))

def mark_and_label_points(image_path, points, output_dir='./test_result', output_filename='background.png'):
    """Mark points on the image with circles, lines, and labels."""
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Image not found at path: {image_path}")

    background = image.copy()

    # Draw the quadrilateral
    for i, point in enumerate(points):
        # Draw circle at each point
        cv2.circle(background, point, radius=5, color=(0, 0, 255), thickness=-1)  # Red dot

        # Draw line to the next point (and loop back to first at the end)
        next_point = points[(i + 1) % len(points)]
        cv2.line(background, point, next_point, color=(0, 255, 0), thickness=2)  # Green line

        # Add coordinate labels
        label = f"{point}"
        y_offset = 20 if i > 1 else -20
        cv2.putText(background, label, (point[0] - 40, point[1] + y_offset),
                    fontFace=cv2.FONT_HERSHEY_SIMPLEX, fontScale=0.5,
                    color=(255, 255, 255), thickness=1, lineType=cv2.LINE_AA)

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, output_filename)
    cv2.imwrite(output_path, background)

def order_points(pts):
    """Order points in the correct sequence: top-left, top-right, bottom-right, bottom-left."""
    # Sort points by y-coordinate
    pts = sorted(pts, key=lambda x: x[1])
    
    # Get top two points (smaller y values)
    top_pts = sorted(pts[:2], key=lambda x: x[0])  # Sort by x-coordinate
    # Get bottom two points (larger y values)  
    bottom_pts = sorted(pts[2:], key=lambda x: x[0])  # Sort by x-coordinate
    
    # Return in order: top-left, top-right, bottom-right, bottom-left
    return [top_pts[0], top_pts[1], bottom_pts[1], bottom_pts[0]]

# Main execution
if __name__ == "__main__":
    # Your corner points - make sure they're in the correct order
    points = [(449, 360), (775, 361), (805, 637), (378, 638)]
    
    # Order the points correctly
    ordered_points = order_points(points)
    
    # Mark the original corner points
    mark_and_label_points('chess_match.png', ordered_points, output_filename='contour.png')
    
    # Get perspective transformation matrix
    perspective_matrix = get_matrix(ordered_points)
    
    # Generate all chess squares
    chessboard_segmentation(perspective_matrix)