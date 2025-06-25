[Task]
- no ffmpeg integration, incomplete video export feature (10)

[Breakdown]
progress so far : 
- Chess animation generated successfully (overlay.py)
- Individual move can be overlayed onto background.mp4 (render.py)
- functional frontend entry point

To be done : 

(1) how to specify the chess overlay's postion ? (App.tsx, VideoContainer.tsx)
solution -> include x and y offset in export.json

(2) how share workspace data with rendering scripts in py-util ? (App.tsx)

- what fields are required for rendering chess animation ?
["framePerMove", "timePerMove", "moves", "boardSize", "evaluations"] 

- what fields are required for overlaying ?
["x-offset", "y-offset", "timestamps", "timePerMove"]       

solution -> make 2 export.json seperate files for /remotion and /py-util

(3) Update render.py to render the full overlay (render.py)