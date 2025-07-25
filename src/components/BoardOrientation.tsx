import { AppContext } from '@/App';
import { useState, useContext} from 'react';
import { RotateCw, Check, X } from 'lucide-react';
import EvalBar from './EvalBar';
import { Chess, Square } from 'chess.js';

const darkenColor = (color: string, amount: number) => {
  const hex = color.replace('#', '');
  const rgb = parseInt(hex, 16);
  const r = Math.max(0, Math.floor((rgb >> 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(((rgb >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((rgb & 0xff) * (1 - amount)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
};

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

function algebraicNotation(row: number, col: number): Square {
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = 8 - row;
  return (file + rank) as Square;
}

// Function to rotate coordinates based on orientation
function rotatePosition(row: number, col: number, orientation: number) {
  let newRow = row;
  let newCol = col;
  
  for (let i = 0; i < orientation; i++) {
    const temp = newRow;
    newRow = newCol;
    newCol = 7 - temp;
  }
  
  return { row: newRow, col: newCol };
}

function inferFen(fenString: string) {
  try {
    const chess = new Chess(fenString);
    const boardPieces = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = algebraicNotation(row, col);
        const piece = chess.get(square);
        if (piece) {
          const moves = chess.moves({
            square: square,
            verbose: true
          });
          
          const validMoves = moves.map((move, index) => {
            const moveRow = 8 - parseInt(move.to.charAt(1));
            const moveCol = move.to.charCodeAt(0) - 'a'.charCodeAt(0);
            return {
              index,
              row: moveRow,
              col: moveCol,
              display: `#${index}(${moveRow}, ${moveCol})`
            };
          });
          
          boardPieces.push({
            piece: piece.type,
            color: piece.color,
            position: {
              square,
              row,
              col
            },
            validMoves: validMoves,
            display: `current square: (${row}, ${col})\nvalid square in the next turn: ${validMoves.map(m => m.display).join(', ')}`
          });
        }
      }
    }
    
    return boardPieces;
  } catch (error) {
    console.error("Invalid FEN string:", error);
    return [];
  }
}

function BoardOrientation() {
    const boardColors = createChessboardColors();
    const chess = new Chess();
    const boardData = inferFen(chess.fen());
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    const {boardOrientation, setBoardOrientation, 
          setSelectingOrientation, 
          hoveredSquare, setHoveredSquare, 
          setEnableDiscard, interactiveChessboardRef, 
          setIsEditingContour,
          skippedToOrientation} = useContext(AppContext);
    const previewBoardOrientation = (boardOrientation.current + boardOrientation.shifted) % 4;

    const handleRotate = () => {
      setBoardOrientation(
        (prev) => {
          return { 
            ...prev,
            shifted: (prev.shifted + 1) % 4
          };
        }
      );
    };

    const handleOk = () => {
      interactiveChessboardRef.current?.finalize();
      setEnableDiscard(false);
      setSelectingOrientation(false);
      setBoardOrientation(
        (prev) => {
          return { 
            current: (prev.current + prev.shifted) % 4,
            shifted: 0
          };
        }
      );
      skippedToOrientation.current = false;
    };

    const handleCancel = () => {
      setSelectingOrientation(false);
      setIsEditingContour(!skippedToOrientation.current);
      setEnableDiscard(false);
      setBoardOrientation(
        (prev) => {
          return { 
            ...prev,
            shifted: 0
          };
        }
      );
      skippedToOrientation.current = false;
    };

    return (
        <>
            <div className='flex flex-row w-full aspect-9/8 gap-1'>
                <div className="flex flex-row flex-wrap h-full aspect-square relative">
                    {boardColors.map((row, rowIndex) => (
                    row.map((color, colIndex) => {
                        const squareIndex = rowIndex * 8 + colIndex;
                        const squareKey = `${rowIndex}-${colIndex}`;
                        const hoveredSquareKey = `${hoveredSquare?.row}-${hoveredSquare?.col}`
                        const isHighlighted = hoveredSquareKey === squareKey;
                        const borderColor = isHighlighted ? darkenColor(color, 0.3) : color;

                        // Apply rotation to square position
                        const rotatedSquarePos = rotatePosition(rowIndex, colIndex, previewBoardOrientation);
                        
                        return (
                        <div
                            key={squareIndex}
                            className="w-1/8 h-1/8 absolute"
                            style={{
                              transition: 'left 0.2s ease-in-out, top 0.2s ease-in-out',
                              backgroundColor: color,
                              boxSizing: 'border-box',
                              boxShadow: `0px 0px 0px 5px ${borderColor} inset`,
                              left: `${rotatedSquarePos.col * 12.5}%`,
                              top: `${rotatedSquarePos.row * 12.5}%`,
                            }}
                            onMouseEnter={() => setHoveredSquare({row: rowIndex, col: colIndex})}
                            onMouseLeave={() => setHoveredSquare(null)}
                        ></div>
                        );
                    })
                    ))}

                    {/* Render pieces on top with rotation */}
                    {boardData.map((piece) => {
                        const label = piece.color + piece.piece.toUpperCase();
                        const { row, col } = piece.position;
                        
                        // Apply rotation to piece position
                        const rotatedPos = rotatePosition(row, col, previewBoardOrientation);

                        return (
                            <img
                                key={`${piece.position.square}`}
                                src={`/chess/${label}.svg`}
                                className="absolute w-[12.5%] h-[12.5%] pointer-events-none"
                                style={{
                                    left: `${rotatedPos.col * 12.5}%`,
                                    top: `${rotatedPos.row * 12.5}%`
                                }}
                                alt={label}
                            />
                        );
                    })}
                </div>
                <EvalBar score={0.33} turn={"w"} />
            </div>
            <div className='w-full h-full flex flex-col'>
                <button
                    onClick={handleRotate}
                    onMouseEnter={() => setHoveredButton("rotate")}
                    onMouseLeave={() => setHoveredButton(null)}
                    className={`flex-1 p-6 transition-all duration-300 flex flex-col items-center justify-center ${
                        hoveredButton === "rotate" 
                            ? 'text-white shadow-lg' 
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                    style={hoveredButton === "rotate" ? { backgroundColor: '#60a5fa', borderColor: '#60a5fa' } : {}}
                >
                    <RotateCw size={56} className="mb-3" />
                    <span className={`text-5xl font-semibold`}>
                        Rotate
                    </span>
                </button>
                <div className="w-full h-px bg-gray-200" />
                <button
                    onClick={handleOk}
                    onMouseEnter={() => setHoveredButton("ok")}
                    onMouseLeave={() => setHoveredButton(null)}
                    className={`flex-1 p-6 transition-all duration-300 flex flex-col items-center justify-center ${
                        hoveredButton === "ok" 
                            ? 'bg-green-500 border-green-600 text-white shadow-lg' 
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                >
                    <Check size={56} className="mb-3" />
                    <span className={`text-5xl font-semibold`}>
                        OK
                    </span>
                </button>
                <div className="w-full h-px bg-gray-200" />
                <button
                    onClick={handleCancel}
                    onMouseEnter={() => setHoveredButton("cancel")}
                    onMouseLeave={() => setHoveredButton(null)}
                    className={`flex-1 p-6 transition-all duration-300 flex flex-col items-center justify-center ${
                        hoveredButton === "cancel" 
                            ? 'bg-red-500 border-red-600 text-white shadow-lg' 
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                >
                    <X size={56} className="mb-3" />
                    <span className={`text-5xl font-semibold`}>
                        Cancel
                    </span>
                </button>
            </div>

        </>
    )
}

export default BoardOrientation