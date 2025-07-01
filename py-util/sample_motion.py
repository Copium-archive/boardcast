import json

video_segments = {
    "segments": [
        [0, 10],
        [15.0, 18],
        [23, 26]
    ]
}

# Dump the JSON data to terminal
print(json.dumps(video_segments))