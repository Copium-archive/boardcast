import {AbsoluteFill, staticFile, Sequence, Img} from 'remotion';
import {interpolate, useCurrentFrame} from 'remotion';
import ChessOverlay from '../src/components/ChessOverlay'
import data from './export.json'

type ChessOverlayAnimationProps = {
  currentFen: string;
  previousFen: string | null;
  previousEval?: string | number | null;
  previousBestMove: string | null; // Optional prop for previous best move
  move: string | null;
  evaluation: string | number | null;
  currentBestMove: string | null; // Added bestMove prop
};

const ChessOverlayAnimation: React.FC<ChessOverlayAnimationProps> = ({currentFen, previousFen, previousEval, previousBestMove, move, evaluation, currentBestMove}) => {
  const frame = useCurrentFrame();
  const moveProgress = interpolate(frame, [0, data.framePerMove-1], [0, 1]);
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
        <Sequence key={i} from={i*data.framePerMove} durationInFrames={data.framePerMove}>  
          <ChessOverlayAnimation
            currentFen={position}
            previousFen={i > 0 ? data.positions[i - 1] : null}
            previousEval={i > 0 ? data.evaluations[i - 1].evaluation : null}
            previousBestMove={i > 0 ? data.evaluations[i - 1].bestMove : null}
            move={i > 0 ? data.moves[i] : null}
            evaluation={data.evaluations[i].evaluation}
            currentBestMove={data.evaluations[i].bestMove || null}
          /> 
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
