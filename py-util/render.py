import subprocess
import sys

def get_overlay_command(overlay_segment, background_segment):
    """
    Generate ffmpeg command to overlay a segment from chess-animation.mp4 onto background.mp4.
    
    If the background segment is longer than the overlay segment, the overlay will
    play and then freeze on its last frame for the remaining duration.

    The output will be the full duration of background.mp4 with the overlay applied
    during the specified time range.
    
    Args:
        overlay_segment: [start_time, end_time] for chess-animation.mp4 segment
        background_segment: [start_time, end_time] for background.mp4 segment to apply overlay
    
    Returns:
        String command for ffmpeg.exe
    """
    overlay_start, overlay_end = overlay_segment
    bg_start, bg_end = background_segment
    
    # Calculate durations
    overlay_duration = overlay_end - overlay_start
    bg_overlay_duration = bg_end - bg_start
    
    # This is the new logic for handling the freeze-frame
    # We will build the filter chain for the overlay video ([1:v])
    overlay_filter_chain = []
    
    # Calculate if we need to freeze the last frame
    freeze_duration = bg_overlay_duration - overlay_duration
    
    if freeze_duration > 0.001: # Use a small epsilon for float comparison
        # tpad filter: pads the end of the video stream by cloning the last frame
        # stop_mode=clone: specifies to repeat the last frame
        # stop_duration: how long to repeat the last frame for
        tpad_filter = f'tpad=stop_mode=clone:stop_duration={freeze_duration}'
        overlay_filter_chain.append(tpad_filter)
        
    # setpts filter: delays the presentation timestamp (PTS) of the overlay
    # This ensures the (now padded) overlay starts at the correct time (bg_start)
    setpts_filter = f'setpts=PTS+{bg_start}/TB'
    overlay_filter_chain.append(setpts_filter)
    
    # Join all the filters for the overlay stream with commas
    full_overlay_filters = ','.join(overlay_filter_chain)
    
    # Construct the final filter_complex string
    # 1. Take the overlay stream [1:v], apply the tpad and setpts filters, and label the output [delayed_overlay].
    # 2. Take the background stream [0:v] and the [delayed_overlay] stream, and overlay them.
    # 3. The 'enable' option ensures the overlay is only visible between bg_start and bg_end.
    filter_complex = (
        f'"[1:v]{full_overlay_filters}[delayed_overlay];'
        f'[0:v][delayed_overlay]overlay=0:0:enable=\'between(t,{bg_start},{bg_end})\'"'
    )
    
    command = (
        f'ffmpeg.exe '
        f'-i background.mp4 '
        # Use -ss and -t on the input to efficiently trim the overlay segment
        f'-ss {overlay_start} -t {overlay_duration} -i chess-animation.mp4 '
        f'-filter_complex {filter_complex} '
        # Copy the audio from the background video without re-encoding
        f'-c:a copy '
        f'-y output.mp4'
    )
    
    return command

def execute_ffmpeg_command(command):
    """
    Execute an ffmpeg command and return the result
    
    Args:
        command: String command to execute
    
    Returns:
        dict with 'success' (bool), 'output' (str), 'error' (str)
    """
    try:
        # For Windows, use shell=True to handle ffmpeg.exe properly
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
            'output': '',
            'error': 'Command timed out after 5 minutes',
            'return_code': -1
        }
    except FileNotFoundError:
        return {
            'success': False,
            'output': '',
            'error': 'ffmpeg.exe not found in PATH or current directory',
            'return_code': -1
        }
    except Exception as e:
        return {
            'success': False,
            'output': '',
            'error': f'Unexpected error: {str(e)}',
            'return_code': -1
        }

# --- Example Usage with your requested scenario ---
# Overlay a 0.2-second clip onto a 4-second segment of the background.
overlay_seg = [0.2, 0.8]  # Duration: 0.2s
bg_seg = [1, 5]          # Duration: 4.0s

# The overlay will play from t=1.0 to t=1.2, and its last frame will be
# frozen on screen from t=1.2 until t=5.0.

cmd_list = get_overlay_command(overlay_seg, bg_seg)

result = execute_ffmpeg_command(cmd_list)

if result['success']:
    print("\nVideo overlay with freeze-frame completed successfully!")
    print("Output video 'output.mp4' has been created.")
else:
    print(f"\nError executing ffmpeg command (return code: {result['return_code']})")
    print("-------------------- FFmpeg Error Log --------------------")
    print(result['error'])
    print("----------------------------------------------------------")