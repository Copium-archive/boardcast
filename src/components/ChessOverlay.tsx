import React, { useState, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import EvalBar from './EvalBar';

type ChessOverlayProps = {
	currentFen: string;
    evaluation: number | string | null;
	opacity?: number;
};

interface Position {
	x: number;
	y: number;
}

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

function ChessOverlay({ currentFen, evaluation, opacity = 1 }: ChessOverlayProps) {
	const boardColors = createChessboardColors();
	const boardData = inferFen(currentFen);
	
	const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
	const overlayRef = useRef<HTMLDivElement>(null);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (!overlayRef.current) return;
		
		const rect = overlayRef.current.getBoundingClientRect();
		const offsetX = e.clientX - rect.left;
		const offsetY = e.clientY - rect.top;
		
		setDragOffset({ x: offsetX, y: offsetY });
		setIsDragging(true);
		
		// Prevent default to avoid text selection
		e.preventDefault();
	}, []);

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDragging || !overlayRef.current) return;
		
		const parentRect = overlayRef.current.parentElement?.getBoundingClientRect();
		if (!parentRect) return;
		
		const overlayRect = overlayRef.current.getBoundingClientRect();
		
		// Calculate new position
		let newX = e.clientX - parentRect.left - dragOffset.x;
		let newY = e.clientY - parentRect.top - dragOffset.y;
		
		// Constrain to parent bounds
		const maxX = parentRect.width - overlayRect.width;
		const maxY = parentRect.height - overlayRect.height;
		
		newX = Math.max(0, Math.min(newX, maxX));
		newY = Math.max(0, Math.min(newY, maxY));
		
		setPosition({ x: newX, y: newY });
	}, [isDragging, dragOffset]);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Add and remove event listeners
	React.useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			
			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	return (
		<div 
			ref={overlayRef}
			className="absolute aspect-9/8 gap-1 h-100 flex flex-row cursor-move select-none"
			style={{ 
				opacity,
				left: `${position.x}px`,
				top: `${position.y}px`,
				transform: isDragging ? 'scale(1.02)' : 'scale(1)',
				transition: isDragging ? 'none' : 'transform 0.1s ease',
				zIndex: isDragging ? 50 : 10,
			}}
			onMouseDown={handleMouseDown}
		>
			<div className='aspect-square h-full flex flex-row flex-wrap relative'>
				{boardData.map((piece, idx) => {
					const label = piece.color + piece.piece.toUpperCase();
					const { row, col } = piece.position;
					return (
						<img
							key={idx}
							src={`/chess/${label}.svg`}
							className="absolute w-[12.5%] h-[12.5%] pointer-events-none"
							style={{
								left: `${col * 12.5}%`,
								top: `${row * 12.5}%`,
							}}
							alt={label}
						/>
					);
				})}
				{boardColors.map((row, rowIdx) => (
					row.map((color, colIdx) => {
						return (
						<div
							key={`${rowIdx}-${colIdx}`}
							className="w-1/8 h-1/8"
							style={{ 
								backgroundColor: color, 
							}}
						></div>
						);
					})
				))}
			</div>
			<EvalBar score={evaluation} turn={getTurnFromFen(currentFen) ?? "w"} />
		</div>
	);
}

export default ChessOverlay;