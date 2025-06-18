[1 - 10] : the weighted sum of these factors

- impact on UX
- implementation complexity

A simple heuristic for evaluating the importance of a patch

e.g :
1 - high effort, low yield (likely diminishing returns)
10 - Extremely high priority, without patching these problems, the app would be practically unusable

Ongoing problems: 

- no ffmpeg integration, incomplete video export feature (10)
- users aren't allowed to remove a chess overlay (9)
- checkpoints can be deleted without first removing the chess overlay (8)
- chess overlay configurations resets after re-mounting (7)
- checkpoints doesn't reset upon vid reloading (7)
- duplicated chess positions at diff checkpoints (5)
- users aren't allowed to adjust the timestamps of checkpoints (2)