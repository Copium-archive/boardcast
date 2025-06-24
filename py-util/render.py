import subprocess
import sys

def get_overlay_command(overlay_segment, background_segment):
    """
    Generate an ffmpeg command to overlay a video segment, holding the last frame
    if the background duration is longer.

    Args:
        overlay_segment: [start, end] time for the clip from chess-animation.mp4.
        background_segment: [start, end] time on background.mp4 to show the overlay.

    Returns:
        A list of strings representing the ffmpeg command and its arguments.
    """
    overlay_start, overlay_end = overlay_segment
    bg_start, bg_end = background_segment
    
    # Calculate the duration of the clip to be extracted from the overlay video.
    overlay_duration = overlay_end - overlay_start
    
    # This filter graph performs the magic:
    # 1. [1:v]setpts=PTS-STARTPTS... : Takes the overlay clip and resets its timestamp to start at 0.
    # 2. ...overlay=... : Places the overlay on the background video ([0:v]).
    # 3. eof_action=repeat : THIS IS THE KEY. When the overlay clip ends, it repeats the last frame.
    # 4. enable='between(t,...)': Activates the overlay (playing or frozen) only during the background segment time.
    filter_graph = (
        f"[1:v]setpts=PTS-STARTPTS[overlay_trimmed];"
        f"[0:v][overlay_trimmed]overlay=x=0:y=0:eof_action=repeat:enable='between(t,{bg_start:.4f},{bg_end:.4f})'"
    )

    # Construct the command as a list of arguments.
    # We no longer need to compare durations in Python; ffmpeg handles it all.
    command_list = [
        'ffmpeg.exe',
        # Input 0: The main background video. Its full duration is used.
        '-i', 'background.mp4',
        # Input 1: The overlay video, with -ss and -t to extract only the desired clip.
        '-ss', f'{overlay_start:.4f}',
        '-t', f'{overlay_duration:.4f}',
        '-i', 'chess-animation.mp4',
        # The complex filter graph that combines them.
        '-filter_complex', filter_graph,
        # Copy the audio stream from the background without re-encoding.
        '-c:a', 'copy',
        # Overwrite output file if it exists.
        '-y', 'output.mp4'
    ]
    
    return command_list

def execute_ffmpeg_command(command_list):
    """
    Execute an ffmpeg command and return the result
    
    Args:
        command_list: A list of strings representing the command to execute
    
    Returns:
        dict with 'success' (bool), 'output' (str), 'error' (str)
    """
    try:
        result = subprocess.run(
            command_list, 
            shell=False,
            capture_output=True, 
            text=True, 
            timeout=300,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )
        
        return {
            'success': result.returncode == 0,
            'output': result.stdout,
            'error': result.stderr,
            'return_code': result.returncode
        }
        
    except subprocess.TimeoutExpired:
        return {'success': False, 'output': '', 'error': 'Command timed out', 'return_code': -1}
    except FileNotFoundError:
        return {'success': False, 'output': '', 'error': 'ffmpeg.exe not found', 'return_code': -1}
    except Exception as e:
        return {'success': False, 'output': '', 'error': f'Unexpected error: {str(e)}', 'return_code': -1}

# --- Example Usage with your requested scenario ---
# Overlay a 0.2-second clip onto a 4-second segment of the background.
overlay_seg = [0.2, 0.4]  # Duration: 0.2s
bg_seg = [1, 5]          # Duration: 4.0s

# The overlay will play from t=1.0 to t=1.2, and its last frame will be
# frozen on screen from t=1.2 until t=5.0.

cmd_list = get_overlay_command(overlay_seg, bg_seg)

print("--- Generated Command Breakdown ---")
# Join the list into a single string for readable printing
readable_cmd = ' '.join(f'"{arg}"' if ' ' in arg else arg for arg in cmd_list)
print(readable_cmd)
print("-----------------------------------")

result = execute_ffmpeg_command(cmd_list)

if result['success']:
    print("\nVideo overlay with freeze-frame completed successfully!")
    print("Output video 'output.mp4' has been created.")
else:
    print(f"\nError executing ffmpeg command (return code: {result['return_code']})")
    print("-------------------- FFmpeg Error Log --------------------")
    print(result['error'])
    print("----------------------------------------------------------")