import subprocess
import sys
import json
import os

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
    """
    Execute an ffmpeg command and return the result.
    (This function remains unchanged)
    """
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
        return { 'success': result.returncode == 0, 'output': result.stdout, 'error': result.stderr, 'return_code': result.returncode }
    except subprocess.TimeoutExpired:
        return { 'success': False, 'error': 'Command timed out after 5 minutes', 'return_code': -1 }
    except FileNotFoundError:
        return { 'success': False, 'error': 'ffmpeg.exe not found in PATH or current directory', 'return_code': -1 }
    except Exception as e:
        return { 'success': False, 'error': f'Unexpected error: {str(e)}', 'return_code': -1 }

remotion_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'remotion'))
export_json_path = os.path.join(remotion_dir, 'export.json')

try:
    with open(export_json_path, 'r', encoding='utf-8') as f:
        export_data = json.load(f)
        
    print("\nLoaded export.json successfully.")
except FileNotFoundError:
    print(f"\nCould not find export.json at {export_json_path}")
except json.JSONDecodeError as e:
    print(f"\nError decoding export.json: {e}")

# --- Example Usage with your requested scenario ---
# Define the multiple overlay operations
overlay_segs = [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.0]]
bg_segs = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]
x_offset = export_data.get('x_offset', 0)
y_offset = export_data.get('y_offset', 0)

# Generate the single, consolidated ffmpeg command
try:
    cmd = get_multiple_overlay_command(overlay_segs, bg_segs, xy_offset=[x_offset, y_offset])

    # Execute the command
    result = execute_ffmpeg_command(cmd)

    if result['success']:
        print("\nVideo with multiple overlays completed successfully!")
        print("Output video 'output.mp4' has been created.")
    else:
        print(f"\nError executing ffmpeg command (return code: {result['return_code']})")
        print("-------------------- FFmpeg Error Log --------------------")
        print(result['error'])
        print("----------------------------------------------------------")

except ValueError as e:
    print(f"Error: {e}")