import subprocess
import os

def render_chess_animation():
    # Full command as a single string for shell execution
    command = "npx remotion render remotion/index.ts Chess out.mp4"

    # Set working directory to project root
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    try:
        # Run command in shell to find 'npx'
        subprocess.run(command, cwd=root_dir, shell=True, check=True)
        print("✅ Chess animation rendered successfully.")
    except subprocess.CalledProcessError as e:
        print("❌ Rendering failed with error:")
        print(e)

if __name__ == "__main__":
    render_chess_animation()
