[Task]
- Adopt the chessboard segmentation strategy from move_interpreter.py 

[Breakdown]

After some research, I realized that the quote unquote "chessboard segmentation" 
(sample_script/move_interpreter.py) is simply just matrix multiplication at the core

The current 3D to 2D mapping strategy is something like this :

(1) First the callback function receives the mouse coordinates 
(2) Then it'll apply perspective transformation (i.e a bunch of matrix operations chained together) to get the new mouse coordinates in the wrapped space, let's denote the output as (x', y')
(3) Now it divides (x', y') by the square size to find its corresponding square

However, adopting this into our Tauri app is anything but straightforward 
Since each click would trigger the following sequence of events : 

frontend -> (invoke) -> rust backend -> (run python subprocess) -> move_intepreter.py

Imagine what would happen if a user clicks the chessboard nonstop

So I want to propose another approach :

- In the front-end, let the users select the 4 corners in as usual, then send this data to move_interpreter.py

- move_interpreter will perform inverse perspective transformation and return a list of 64 tuples, each containing 4 elements. This list represents the 64 squares of our chessboard 

- In the front-end, we'll fetch the list and turns them into clickable elements with id = {the square's label}. These elements aren't rectangular like traditional web UI components, so we'd have to work around that 

This way, we only need to run the script once, and users will interact with the frontend for the rest of the time

To do : 
(3) set up primitive front-end entry point : 
- a button for running the script
- log the result to console