[Task]
- Implement 3D to 2D move mapping

[Breakdown]

Aight let's break this son of a bitch down

First of, every chess move can be formatted to a (from_square, to_square) tuple. Well, except for promotions, but we'll handle that later 

I don't want to mess with graph representations, so let's go with the most straightforward option : 

- the User MUST specify both the "from_square" and the "to_square" in a single checkpoint to complete the procedure
- immediately infer the move and map it to the analysis board upon completion
- the new position is computed from the prior position (according to the video timeline) and the new move
- In CheckpointCarousel.tsx, highlight the checkpoints that are being edited or have a FEN code
- For better visual clarity, allow the interactive chessboard to display in 2 modes with different layouts 

so how do we implement this? 

(1) implement square selection (InteractiveChessboard.tsx)
(3) get FEN of the new position and add it to the current overlay