import {AbsoluteFill, staticFile, Sequence, Img} from 'remotion';
import {interpolate, useCurrentFrame} from 'remotion';
import ChessOverlay from '../src/components/ChessOverlay'
import data from './export.json'

type ChessOverlayAnimationProps = {
  currentFen: string;
  previousFen: string | null;
  previousEval?: string | number | null;
  move: string | null;
  evaluation: string | number | null;
  previousBestMove: string | null; // Optional prop for previous best move
  currentBestMove: string | null; // Added bestMove prop
};

const ChessOverlayAnimation: React.FC<ChessOverlayAnimationProps> = ({currentFen, previousFen, previousEval, move, evaluation, previousBestMove, currentBestMove}) => {
  const frame = useCurrentFrame();
  const moveProgress = interpolate(frame, [0, 4], [0, 1]);
  const bestMove = moveProgress === 1 ? currentBestMove : previousBestMove;

  if (move) {
    return (
      <ChessOverlay
      currentFen={currentFen}
      evaluation={evaluation}
      path_resolver={staticFile}
      imageContainer={Img}
      movement={{
        move: move,
        previousFen: previousFen ?? undefined,
        progress: moveProgress
      }}
      {...(previousEval !== undefined && previousEval !== null
        ? {
        evalchange: {
          previousEval: previousEval,
          progress: moveProgress
        }
        }
        : {})}
      size={data.boardSize}
      bestMove={bestMove}
      />
    );
  } else {
    return (
      <ChessOverlay
        currentFen={currentFen}
        evaluation={evaluation}
        path_resolver={staticFile}
        imageContainer={Img}
        size={data.boardSize}
        bestMove={bestMove}
      />
    );
  }
};

export const ChessComponent = () => {
  return (
    <AbsoluteFill>
      {data.positions.map((position: string, i: number) => (
        <Sequence key={i} from={i*5} durationInFrames={5}>  // ✅ Added key
          <ChessOverlayAnimation
            currentFen={position}
            previousFen={i > 0 ? data.positions[i - 1] : null}
            previousEval={i > 0 ? data.evaluations[i - 1].evaluation : null}
            move={i > 0 ? data.moves[i] : null}
            evaluation={data.evaluations[i].evaluation}
            previousBestMove={i > 0 ? data.evaluations[i - 1].bestMove : null} // Pass previous bestMove prop
            currentBestMove={data.evaluations[i].bestMove || null}  // Pass bestMove prop
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
