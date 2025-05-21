import { useContext, useState } from 'react';
import { Chess, Square } from 'chess.js';
import { useRef, useEffect } from "react";
import BestMoveArrow from './BestMoveArrow';
import PawnPromotion from './PawnPromotion';
import EvalBar from './EvalBar';
import useEval from '@/lib/useEval';
import { BoardContext } from './AnalysisBoard';
import { AppContext } from '@/App';

interface Move {
  index: number; 
  row: number; 
  col: number; 
  display: string; 
}

interface Piece {
  piece: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'; 
  color: 'w' | 'b'; 
  position: {
    square: string; 
    row: number; 
    col: number; 
  };
  validMoves: Move[]; 
  display: string; 
}

interface Promotion {
  currentSquare: string;      
  targetSquare: string;       
  color: 'w' | 'b';         
  promotion: 'q' | 'r' | 'b' | 'n' | null; 
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

const darkenColor = (color: string, amount: number) => {
  const hex = color.replace('#', '');
  const rgb = parseInt(hex, 16);
  const r = Math.max(0, Math.floor((rgb >> 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(((rgb >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((rgb & 0xff) * (1 - amount)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
};

function algebraicNotation(row: number, col: number): Square {
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = 8 - row;
  return (file + rank) as Square;
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

function parseFenAndGetMoves(fenString: string) {
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

export default function ChessBoard() {
  const boardColors = createChessboardColors();
  const {setPositions, setMoves} = useContext(AppContext);
  const {currentFen, PgnOperation} = useContext(BoardContext);
  const {evaluation, bestMove} = useEval();
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [highlight, setHighlight] = useState(
    Array.from({ length: 8 }, () => Array(8).fill(0))
  );
  const [promotion, setPromotion] = useState<Promotion | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  const handleSelect = (piece: Piece) => {
    if (piece.position.square === selectedPiece?.position.square) {
      setHighlight(Array.from({ length: 8 }, () => Array(8).fill(0)));
      setSelectedPiece(null);
      return;
    }
    const selectedPieceCoordinates = {
      row: piece.position.row,
      col: piece.position.col,
    };
  
    const validMoveCoordinates = piece.validMoves.map((move: { row: number; col: number; }) => ({
      row: move.row,
      col: move.col,
    }));
  
    const newHighlight = Array.from({ length: 8 }, () => Array(8).fill(0));
    newHighlight[selectedPieceCoordinates.row][selectedPieceCoordinates.col] = 1;
    validMoveCoordinates.forEach(move => {
      newHighlight[move.row][move.col] = 1;
    });
    
    setHighlight(newHighlight);
    setSelectedPiece(piece);
  };

  const appendMove = (newPosition: Chess) => {
    setPositions((prevPositions) => {
      const newPositions = [...prevPositions];
      newPositions.push(newPosition.fen());
      return newPositions;
    });
    setMoves((prevMoves) => {
      const newMoves = [...prevMoves];
      newMoves.push(newPosition.history({ verbose: true }).slice(-1)[0].san);
      return newMoves;
    });
    PgnOperation.current = 'append';
  }

  const handleSquare = (row: number, col:number) => {
    setHighlight(Array.from({ length: 8 }, () => Array(8).fill(0)));
    setSelectedPiece(null);
    if(highlight[row][col] == 1) {
      const currentSquare = selectedPiece!.position.square;
      const targetSquare = algebraicNotation(row, col);
      const newPosition = new Chess(currentFen);
      try {
        newPosition.move({ from: currentSquare, to: targetSquare });
        appendMove(newPosition);
      } catch {
        setPromotion({
          currentSquare: currentSquare,
          targetSquare: targetSquare,
          color: selectedPiece!.color,
          promotion: null
        });
        return
      }
    }
  }

  useEffect(() => {
    const board = boardRef.current;
    const turn = getTurnFromFen(currentFen);
    const boardData = parseFenAndGetMoves(currentFen);
    if (board) {
      setHighlight(Array.from({ length: 8 }, () => Array(8).fill(0)));
      setSelectedPiece(null);
      const existingPieces = board.querySelectorAll(".chess-piece");
      existingPieces.forEach(piece => piece.remove());
      for (const piece of boardData) {
        const label = piece.color + piece.piece.toUpperCase();
        const { row, col } = piece.position;
        const pieceElement = document.createElement("img");
        pieceElement.src = `/chess/${label}.svg`;
        pieceElement.classList.add("chess-piece", "absolute", "w-1/8", "h-1/8");
        pieceElement.style.left = `${col * 12.5}%`;
        pieceElement.style.top = `${row * 12.5}%`;
        
        if (piece.color === turn) {
          pieceElement.onclick = () => handleSelect(piece);
        } else {
          pieceElement.classList.add("pointer-events-none");
        }
    
        board.appendChild(pieceElement);
      }
    }
  }, [currentFen]);  

  return (
    <div className='flex flex-row w-full aspect-8/7 gap-1'>
      <div className="flex flex-row flex-wrap h-full aspect-square relative" ref={boardRef}>
        {bestMove && boardRef.current && (
            <BestMoveArrow 
              bestMove={
                typeof bestMove === 'string' 
                  ? { from: bestMove.substring(0, 2) as Square, to: bestMove.substring(2, 4) as Square } 
                  : bestMove
              } 
            />
        )}
        {promotion && (
          <PawnPromotion 
            color={promotion.color} 
            handlePromotion={(promoteTo) => {
              const newPosition = new Chess(currentFen);
              newPosition.move({
                from: promotion.currentSquare,
                to: promotion.targetSquare,
                promotion: promoteTo
              });
              appendMove(newPosition);
              setPromotion(null);
            }} 
          />
        )}        
        {boardColors.map((row, rowIndex) => (
          row.map((color, colIndex) => {
            const squareIndex = rowIndex * 8 + colIndex;
            const isHighlighted = highlight[rowIndex][colIndex] === 1;
            const borderColor = isHighlighted ? darkenColor(color, 0.2) : color;
            
            return (
              <div
                key={squareIndex}
                className="w-1/8 h-1/8"
                style={{ 
                  backgroundColor: color, 
                  boxSizing: 'border-box',
                  boxShadow: `0px 0px 0px 5px ${borderColor} inset` 
                }}
                onClick={() => handleSquare(rowIndex, colIndex)}
              ></div>
            );
          })
        ))}
      </div>
      <EvalBar score={evaluation} turn={getTurnFromFen(currentFen) ?? "w"} />
    </div>
  );
}