import subprocess
import sys
import json
import os
import time

def render_chess_animation():
    """
    Render the chess animation using Remotion.
    
    Returns:
        dict: Result of the rendering operation with success status and output.
    """
    # Full command as a single string for shell execution
    command = "npx remotion render remotion/index.ts Chess py-util/chess-animation.mp4"

    # Set working directory to project root
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    try:
        print("Starting chess animation rendering...")
        print(f"Working directory: {root_dir}")
        print(f"Command: {command}")
        
        # Run command in shell to find 'npx'
        result = subprocess.run(
            command, 
            cwd=root_dir, 
            shell=True, 
            check=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        print("Chess animation rendered successfully.")
        return {
            'success': True,
            'output': result.stdout,
            'error': result.stderr if result.stderr else None
        }
        
    except subprocess.CalledProcessError as e:
        error_msg = f"Rendering failed with return code {e.returncode}"
        print(error_msg)
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        return {
            'success': False,
            'output': e.stdout if e.stdout else None,
            'error': f"{error_msg}\nSTDERR: {e.stderr}\nSTDOUT: {e.stdout}"
        }
    except subprocess.TimeoutExpired:
        error_msg = "Rendering timed out after 5 minutes"
        print(error_msg)
        return {
            'success': False,
            'output': None,
            'error': error_msg
        }
    except Exception as e:
        error_msg = f"Unexpected error during rendering: {str(e)}"
        print(error_msg)
        return {
            'success': False,
            'output': None,
            'error': error_msg
        }

def get_multiple_overlay_command(overlay_segs, bg_segs, xy_offset=None, background_file="background.mp4", overlay_file="chess-animation.mp4", output_file="output.mp4"):
    """
    Generate a single ffmpeg command to apply multiple overlays sequentially at a fixed position.

    Each overlay can have a different duration than its corresponding background
    segment. If the background segment is longer, the overlay will freeze on its
    last frame.

    Args:
        overlay_segs (list): A list of [start, end] times for segments from the overlay_file.
        bg_segs (list): A list of [start, end] times for when to apply overlays on the background_file.
        xy_offset (list or tuple, optional): A single [x, y] coordinate pair for the position
                                             of ALL overlays. If None, defaults to [0, 0].
        background_file (str): Path to the background video.
        overlay_file (str): Path to the overlay video.
        output_file (str): Path for the output video.

    Returns:
        String command for ffmpeg.exe
    """
    if len(overlay_segs) != len(bg_segs):
        raise ValueError("The number of overlay segments must match the number of background segments.")

    # --- Handle the single xy_offset for all overlays ---
    if xy_offset is None:
        xy_offset = [0, 0]  # Default to top-left corner
    
    if not isinstance(xy_offset, (list, tuple)) or len(xy_offset) != 2:
        raise ValueError("xy_offset must be a list or tuple of two numbers, e.g., [x, y].")
    
    x_pos, y_pos = xy_offset

    # --- 1. Build the Input File List ---
    input_cmds = [f'-i {background_file}']
    for seg in overlay_segs:
        start, end = seg
        duration = end - start
        input_cmds.append(f'-ss {start} -t {duration} -i {overlay_file}')
    
    full_input_str = ' '.join(input_cmds)

    # --- 2. Build the Filter Complex Chain ---
    filter_complex_parts = []
    last_video_stream = "[0:v]"  # Start with the background video stream

    # Iterate through each overlay operation. The xy position is now fixed from outside the loop.
    for i, (overlay_seg, bg_seg) in enumerate(zip(overlay_segs, bg_segs), start=1):
        overlay_start, overlay_end = overlay_seg
        bg_start, bg_end = bg_seg

        overlay_duration = overlay_end - overlay_start
        bg_overlay_duration = bg_end - bg_start

        current_overlay_stream = f"[{i}:v]"
        processed_overlay_stream = f"[processed_overlay_{i}]"
        output_stream_label = f"[v_out_{i}]"

        # --- Sub-filter for the current overlay (tpad, setpts) ---
        overlay_sub_filters = []
        freeze_duration = bg_overlay_duration - overlay_duration
        if freeze_duration > 0.001:
            tpad_filter = f'tpad=stop_mode=clone:stop_duration={freeze_duration}'
            overlay_sub_filters.append(tpad_filter)
        
        setpts_filter = f'setpts=PTS+{bg_start}/TB'
        overlay_sub_filters.append(setpts_filter)

        filter_complex_parts.append(
            f'{current_overlay_stream}{",".join(overlay_sub_filters)}{processed_overlay_stream}'
        )

        # --- Overlay filter using the single x_pos and y_pos ---
        overlay_filter = (
            f'{last_video_stream}{processed_overlay_stream}'
            f'overlay={x_pos}:{y_pos}:enable=\'between(t,{bg_start},{bg_end})\''
            f'{output_stream_label}'
        )
        filter_complex_parts.append(overlay_filter)
        
        last_video_stream = output_stream_label

    full_filter_complex = f'"{";".join(filter_complex_parts)}"'

    # --- 3. Assemble the Final Command ---
    command = (
        f'ffmpeg.exe {full_input_str} '
        f'-filter_complex {full_filter_complex} '
        f'-map "{last_video_stream}" '
        f'-map 0:a? '
        f'-c:a copy '
        f'-y {output_file}'
    )
    
    return command

def execute_ffmpeg_command(command):
    try:
        print(f"Executing ffmpeg in working directory: {os.getcwd()}")
        print(f"Generated Command:\n{command}\n")
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        return { 
            'success': result.returncode == 0, 
            'output': result.stdout, 
            'error': result.stderr, 
            'return_code': result.returncode 
        }
    except subprocess.TimeoutExpired:
        return { 
            'success': False, 
            'error': 'FFmpeg command timed out after 5 minutes', 
            'return_code': -1 
        }
    except FileNotFoundError:
        return { 
            'success': False, 
            'error': 'ffmpeg.exe not found in PATH or current directory', 
            'return_code': -1 
        }
    except Exception as e:
        return { 
            'success': False, 
            'error': f'Unexpected error: {str(e)}', 
            'return_code': -1 
        }

def load_export_data():
    remotion_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'remotion'))
    export_json_path = os.path.join(remotion_dir, 'export.json')

    try:
        with open(export_json_path, 'r', encoding='utf-8') as f:
            export_data = json.load(f)
            
        print(f"Loaded export.json successfully from {export_json_path}")
        return export_data
    except FileNotFoundError:
        print(f"Could not find export.json at {export_json_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding export.json: {e}")
        return None

def process_overlay_data(export_data):
    try:
        timePerMove = export_data.get('timePerMove', 0.2)
        timestamps = export_data.get('timestamps', [])
        numberOfMoves = len(timestamps)

        if numberOfMoves == 0:
            print("No timestamps found in export data")
            return None

        overlay_segs = [[round(i*timePerMove, 3), round((i+1)*timePerMove, 3)] for i in range(numberOfMoves)]
        
        # Make a copy of timestamps to avoid modifying the original
        timestamps_copy = timestamps.copy()
        timestamps_copy.append(7)  # Add end time
        
        bg_segs = [[round(timestamps_copy[i-1]-timePerMove, 3), timestamps_copy[i]] for i in range(1, numberOfMoves+1)]
        bg_segs[0][0] = round(bg_segs[0][0]+timePerMove, 3)  # padding for initial position
        
        x_offset = export_data.get('x_offset', 0)
        y_offset = export_data.get('y_offset', 0)
        xy_offset = [x_offset, y_offset]

        print(f"Processed overlay data: {numberOfMoves} moves")
        print(f"Overlay segments: {overlay_segs}")
        print(f"Background segments: {bg_segs}")
        print(f"XY Offset: {xy_offset}")

        return overlay_segs, bg_segs, xy_offset
    except Exception as e:
        print(f"Error processing overlay data: {e}")
        return None

def main():
    print("=== Starting Combined Video Processing Pipeline ===")
    
    # Step 1: Load export data
    print("\n--- Step 1: Loading export data ---")
    export_data = load_export_data()
    if export_data is None:
        print("Failed to load export data. Aborting.")
        return {"success": False, "error": "Failed to load export.json"}

    # Step 2: Render chess animation
    print("\n--- Step 2: Rendering chess animation ---")
    render_result = render_chess_animation()
    if not render_result['success']:
        print("Failed to render chess animation. Aborting.")
        return {
            "success": False, 
            "error": f"Rendering failed: {render_result['error']}",
            "render_output": render_result.get('output')
        }

    # Step 3: Process overlay data
    print("\n--- Step 3: Processing overlay data ---")
    overlay_data = process_overlay_data(export_data)
    if overlay_data is None:
        print("Failed to process overlay data. Aborting.")
        return {"success": False, "error": "Failed to process overlay data"}
    
    overlay_segs, bg_segs, xy_offset = overlay_data

    # Step 4: Generate and execute overlay command
    print("\n--- Step 4: Applying overlays with FFmpeg ---")
    try:
        # Check if required files exist
        background_file = "background.mp4"
        overlay_file = "chess-animation.mp4"
        
        if not os.path.exists(background_file):
            return {"success": False, "error": f"Background file '{background_file}' not found"}
        
        if not os.path.exists(overlay_file):
            return {"success": False, "error": f"Overlay file '{overlay_file}' not found"}

        cmd = get_multiple_overlay_command(overlay_segs, bg_segs, xy_offset=xy_offset)
        overlay_result = execute_ffmpeg_command(cmd)

        if overlay_result['success']:
            print("\n=== Video Processing Pipeline Completed Successfully! ===")
            print("Output video 'output.mp4' has been created.")
            return {
                "success": True,
                "message": "Video processing completed successfully",
                "render_output": render_result.get('output'),
                "overlay_output": overlay_result.get('output')
            }
        else:
            print(f"\nError executing ffmpeg command (return code: {overlay_result['return_code']})")
            print("-------------------- FFmpeg Error Log --------------------")
            print(overlay_result['error'])
            print("----------------------------------------------------------")
            return {
                "success": False,
                "error": f"FFmpeg failed: {overlay_result['error']}",
                "render_output": render_result.get('output'),
                "overlay_output": overlay_result.get('output')
            }

    except ValueError as e:
        error_msg = f"Overlay configuration error: {e}"
        print(error_msg)
        return {"success": False, "error": error_msg}
    except Exception as e:
        error_msg = f"Unexpected error during overlay processing: {e}"
        print(error_msg)
        return {"success": False, "error": error_msg}

if __name__ == "__main__":
    result = main()
    
    # Print final result as JSON for easy parsing by the frontend
    print("\n=== FINAL RESULT ===")
    print(json.dumps(result, indent=2))