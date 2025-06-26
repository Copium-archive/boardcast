[Task]
- no ffmpeg integration, incomplete video export feature (10)

[Breakdown]
progress so far : 
- Chess animation generated successfully
- functional frontend entry point
- x and y offsets included in export.json
- current script capable of rendering multiple overlays

To be done : 

(1) extract neccessary data from export.json (overlay.py), including the following fields:
["x_offset", "y_offset", "timestamps", "timePerMove"]

let's denote the timestamp as x:

for rendering chess position : [x-timePerMove] [x] [static overlay] [next move's timestamp]

(2) make the export button fully functional (App.tsx)
(3) stream result to frontend, make it comprehensible