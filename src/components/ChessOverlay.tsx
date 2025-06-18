/* eslint-disable @typescript-eslint/no-explicit-any */
import { Chess, Square } from 'chess.js';
import EvalBar from './EvalBar';
import BestMoveArrow from './BestMoveArrow';

type ChessOverlayProps = {
  currentFen: string;
  evaluation: number | string | null;
  opacity?: number;
  size?: number;
  path_resolver?: (path: string) => string;
  movement?: {
    move: string | null;
    progress: number;
    previousFen?: string;
  };
  evalchange?: {
    previousEval: number | string | null;
    progress: number;
  };
  imageContainer?: React.ComponentType<any>;
  bestMove?: string | null; // <-- Added bestMove prop
};

interface BoardPiece {
  piece: string;
  color: 'w' | 'b';
  position: {
    square: Square;
    row: number;
    col: number;
  };
  validMoves: {
    index: number;
    row: number;
    col: number;
    display: string;
  }[];
  display: string;
}

interface AnimatedPiece extends BoardPiece {
  animatedPosition?: {
    row: number;
    col: number;
  };
}

function algebraicNotation(row: number, col: number): Square {
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = 8 - row;
  return (file + rank) as Square;
}

function squareToCoordinates(square: Square): { row: number; col: number } {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square.charAt(1));
  return {
    row: 8 - rank,
    col: file
  };
}

function getTurnFromFen(fenString: string): 'w' | 'b' | null {
  try {
    const chess = new Chess(fenString);
    return chess.turn();
  } catch (error) {
    console.error("Invalid FEN string:", error);
    return null;
  }
}

function inferFen(fenString: string): BoardPiece[] {
  try {
    const chess = new Chess(fenString);
    const boardPieces: BoardPiece[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = algebraicNotation(row, col);
        const piece = chess.get(square);
        if (piece) {
          const moves = chess.moves({
            square: square,
            verbose: true,
          });

          const validMoves = moves.map((move, index) => {
            const moveRow = 8 - parseInt(move.to.charAt(1));
            const moveCol = move.to.charCodeAt(0) - 'a'.charCodeAt(0);
            return {
              index,
              row: moveRow,
              col: moveCol,
              display: `#${index}(${moveRow}, ${moveCol})`,
            };
          });

          boardPieces.push({
            piece: piece.type,
            color: piece.color,
            position: {
              square,
              row,
              col,
            },
            validMoves,
            display: `current square: (${row}, ${col})\nvalid square in the next turn: ${validMoves
              .map((m) => m.display)
              .join(', ')}`,
          });
        }
      }
    }

    return boardPieces;
  } catch (error) {
    console.error('Invalid FEN string:', error);
    return [];
  }
}

function parseMove(move: string, previousFen: string): { from: Square; to: Square } | null {
  try {
    const chess = new Chess(previousFen);
    const moveObj = chess.move(move);

    if (!moveObj) return null;

    return {
      from: moveObj.from,
      to: moveObj.to
    };
  } catch (error) {
    console.error('Error parsing move:', error);
    return null;
  }
}

// Function to parse best move string (e.g., "e2e4") into from/to squares
function parseBestMove(bestMove: string): { from: Square; to: Square } | null {
  if (!bestMove || bestMove.length < 4) {
    return null;
  }

  try {
    const from = bestMove.substring(0, 2) as Square;
    const to = bestMove.substring(2, 4) as Square;
    
    // Basic validation of square format
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
      return null;
    }

    return { from, to };
  } catch (error) {
    console.error('Error parsing best move:', error);
    return null;
  }
}

const createChessboardColors = () => {
  const lightSquare = "#f0d9b5";
  const darkSquare = "#b58863";

  const boardColors = Array.from({ length: 8 }, (_, row) => {
    return Array.from({ length: 8 }, (_, col) => {
      return (row + col) % 2 === 0 ? lightSquare : darkSquare;
    });
  });

  return boardColors;
};

function getAnimatedPieces(
  currentFen: string,
  movement: { move: string | null; progress: number; previousFen?: string }
): AnimatedPiece[] {
  const currentPieces = inferFen(currentFen);

  if (!movement.move || movement.progress >= 1 || !movement.previousFen) {
    return currentPieces;
  }

  const moveInfo = parseMove(movement.move, movement.previousFen);
  if (!moveInfo) {
    return currentPieces;
  }

  const previousPieces = inferFen(movement.previousFen);
  const fromCoords = squareToCoordinates(moveInfo.from);
  const toCoords = squareToCoordinates(moveInfo.to);

  // Find the piece that moved
  const movingPiece = currentPieces.find(piece =>
    piece.position.square === moveInfo.to
  );

  if (!movingPiece) {
    return currentPieces;
  }

  // Calculate interpolated position
  const interpolatedRow = fromCoords.row + (toCoords.row - fromCoords.row) * movement.progress;
  const interpolatedCol = fromCoords.col + (toCoords.col - fromCoords.col) * movement.progress;

  // Create animated pieces array
  const animatedPieces: AnimatedPiece[] = [];

  // Add all pieces from previous position except the moving piece
  previousPieces.forEach(piece => {
    if (piece.position.square !== moveInfo.from) {
      // Check if this piece still exists in current position (not captured)
      const stillExists = currentPieces.some(currentPiece =>
        currentPiece.position.square === piece.position.square &&
        currentPiece.piece === piece.piece &&
        currentPiece.color === piece.color
      );

      if (stillExists) {
        animatedPieces.push(piece);
      }
    }
  });

  // Add the moving piece with interpolated position
  animatedPieces.push({
    ...movingPiece,
    animatedPosition: {
      row: interpolatedRow,
      col: interpolatedCol
    }
  });

  return animatedPieces;
}

// Stateless ChessOverlay component (Remotion-friendly)
function ChessOverlay({
  currentFen,
  evaluation,
  opacity = 1,
  size = 200,
  path_resolver = (p) => p,
  movement = { move: null, progress: 1 },
  evalchange,
  imageContainer: ImageContainer = (props) => <img {...props} />,
  bestMove = null // <-- Added bestMove prop with default value
}: ChessOverlayProps) {
  const boardColors = createChessboardColors();
  const boardData = getAnimatedPieces(currentFen, movement);

  const totalWidth = size * (9 / 8);
  const evalBarWidth = totalWidth / 9;
  const textSize = `${(evalBarWidth-4) * 0.4}px`;

  // Parse the best move string into from/to squares
  const parsedBestMove = bestMove ? parseBestMove(bestMove) : null;

  return (
    <div
      className="absolute aspect-9/8 gap-1 flex flex-row"
      style={{
        opacity,
        height: `${size}px`
      }}
    >
      <div className="aspect-square h-full flex flex-row flex-wrap relative">
        {/* Render board squares first */}
        {boardColors.map((row, rowIdx) =>
          row.map((color, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className="w-1/8 h-1/8"
              style={{
                backgroundColor: color,
              }}
            ></div>
          ))
        )}

        {/* Render pieces on top */}
        {boardData.map((piece) => {
          const label = piece.color + piece.piece.toUpperCase();
          const { row, col } = piece.animatedPosition || piece.position;

          return (
            <ImageContainer
              key={`${piece.position.square}`}
              src={path_resolver(`/chess/${label}.svg`)}
              className="absolute w-[12.5%] h-[12.5%]"
              style={{
                left: `${col * 12.5}%`,
                top: `${row * 12.5}%`,
              }}
              alt={label}
            />
          );
        })}

        {/* Render best move arrow */}
        <BestMoveArrow bestMove={parsedBestMove} />
      </div>
      <EvalBar 
        score={evaluation} 
        turn={getTurnFromFen(currentFen) ?? 'w'} 
        evalchange={evalchange} 
        textSize={textSize}
      />
    </div>
  );
}

export default ChessOverlay;