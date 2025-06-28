[Task]

- Build a chessboard contour selector, capture the result and send it to the segmentation script

[Breakdown]

Current goal is to mock up the entry point for selecting the board's contour

(then we'll send the coordinates as CLI args to segmentation.py)

here's how things should go from the user's POV :

(1) first the user needs to enable edit mode by clicking the "toggle edit" button 
(2) In edit mode, the user can pick any point, as long as it stays within the SVG canvas 
(3) 
- When all 4 corners are selected, we proceed to step 4  
- The user can also click the "toggle edit" button to discard the current draft 
(4) 
- Format the coordinates and send them to segmentation.py as CLI args 
- Disable the "toggle edit" button, replace it with a loading icon 
(5) 
- fetch spatial data and project the new chessboard onto its contour 
- Re-enable "toggle edit" button

To do : 

(1) Allow users to discard the current draft 
(2) switch the edit button to waiting mode while executing the chessboard segmentation script