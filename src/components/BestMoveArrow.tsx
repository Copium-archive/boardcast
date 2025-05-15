import React, { useEffect, useState, RefObject } from 'react';
import { Square } from 'chess.js';

interface BestMoveArrowProps {
  bestMove: { from: Square; to: Square } | null;
  boardRef: RefObject<HTMLDivElement | null>; // Keep allowing null for initial render or if board isn't there
}

interface Coordinates {
  x: number;
  y: number;
}

// Helper function to convert algebraic notation to 0-7 row/col
const algebraicToRowCol = (square: Square): { row: number; col: number } => {
    console.log("algebraicToRowCol", square);
    const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(square.charAt(1));
    return { row, col };
};

const BestMoveArrow: React.FC<BestMoveArrowProps> = ({ bestMove, boardRef }) => {
    const [squareSize, setSquareSize] = useState<number>(0); // State to store the size of each square
    const [arrowCoords, setArrowCoords] = useState<{ start: Coordinates; end: Coordinates } | null>(null);

    useEffect(() => {
        // Check if bestMove exists, boardRef is provided, and boardRef.current is available
        if (bestMove && boardRef && boardRef.current) {
            const boardRect = boardRef.current.getBoundingClientRect();
            // Ensure boardRect has valid dimensions to prevent division by zero or NaN issues
            if (boardRect.width === 0 || boardRect.height === 0) {
                setArrowCoords(null); // Board not ready or visible
                return;
            }
            const square = boardRect.width / 8;

            const fromSquare = algebraicToRowCol(bestMove.from);
            const toSquare = algebraicToRowCol(bestMove.to);

            // Calculate the center of the start and end squares for the arrow
            const startX = fromSquare.col * square + square / 2;
            const startY = fromSquare.row * square + square / 2;
            const endX = toSquare.col * square + square / 2;
            const endY = toSquare.row * square + square / 2;

            setArrowCoords({
                start: { x: startX, y: startY },
                end: { x: endX, y: endY },
            });
            setSquareSize(square); 
        } else {
            setArrowCoords(null); // Clear arrow if no best move or board is not available
        }
    }, [bestMove, boardRef]); // useEffect dependencies

    // If there are no coordinates for the arrow, render nothing
    if (!arrowCoords) {
        return null;
    }

    const { start, end } = arrowCoords;
    const arrowColor = "rgba(20, 80, 200, 0.4)"; // Blueish, semi-transparent color for the arrow
    
    // Scale arrow properties based on squareSize
    const arrowThickness = Math.max(5, squareSize * 0.12); // Scales with square size but has a minimum
    
    // Calculate arrow endpoint adjustments to make arrow point exactly at center
    // We need to adjust the end point to account for the arrowhead
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // If start and end are the same, avoid division by zero
    let adjustedEnd = { ...end };
    if (length > 0) {
        // Calculate how much to shorten the line so arrowhead points exactly at target center
        // This offset depends on the arrowhead size
        const arrowheadOffset = squareSize * 0.3; // Proportion of squareSize
        adjustedEnd = {
            x: end.x - (dx / length) * arrowheadOffset,
            y: end.y - (dy / length) * arrowheadOffset
        };
    }
    
    // Clear triangular arrowhead
    const arrowheadLength = squareSize * 0.5; // Length of arrowhead
    const arrowheadWidth = squareSize * 0.5;  // Total width of arrowhead
    
    return (
        <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
        >
        <defs>
            <marker
            id="arrowhead"
            markerWidth={arrowheadLength}
            markerHeight={arrowheadWidth}
            refX="0"
            refY={arrowheadWidth / 2}
            orient="auto"
            markerUnits="userSpaceOnUse"
            >
                <polygon 
                    points={`0,0 ${arrowheadLength},${arrowheadWidth/2} 0,${arrowheadWidth}`} 
                    fill={arrowColor}
                />
            </marker>
        </defs>
        <line
            x1={start.x}
            y1={start.y}
            x2={adjustedEnd.x}
            y2={adjustedEnd.y}
            stroke={arrowColor}
            strokeWidth={arrowThickness}
            markerEnd="url(#arrowhead)"
        />
        </svg>
    );
};

export default BestMoveArrow;