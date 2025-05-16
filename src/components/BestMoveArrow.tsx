import React from 'react';
import { Square } from 'chess.js';

interface BestMoveArrowProps {
  bestMove: { from: Square; to: Square } | null;
}

// Helper function to convert algebraic notation to percentages (0-100%)
const algebraicToPercentage = (square: Square): { x: number; y: number } => {
  const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(square.charAt(1));
  
  // Convert to percentages (0-100%)
  // Each square is 12.5% (100% / 8) of the board width/height
  // Add 6.25% (half of 12.5%) to get to the center of the square
  const x = col * 12.5 + 6.25;
  const y = row * 12.5 + 6.25;
  
  return { x, y };
};

const BestMoveArrow: React.FC<BestMoveArrowProps> = ({ bestMove }) => {
  // If there is no best move, render nothing
  if (!bestMove) {
    return null;
  }

  const fromPos = algebraicToPercentage(bestMove.from);
  const toPos = algebraicToPercentage(bestMove.to);
  
  const arrowColor = "rgba(20, 80, 200, 0.4)"; // Blueish, semi-transparent color
  
  // Scale arrow properties based on percentage of board size
  const arrowThickness = 2; // In percentage units
  
  // Calculate vector for arrow direction
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Adjust end point to account for arrowhead
  let adjustedEnd = { ...toPos };
  if (length > 0) {
    // Shorten the line by a percentage so arrowhead points exactly at target center
    const arrowheadOffset = 3; // Percentage offset
    adjustedEnd = {
      x: toPos.x - (dx / length) * arrowheadOffset,
      y: toPos.y - (dy / length) * arrowheadOffset
    };
  }
  
  // Arrow head dimensions as percentages of board size
  const arrowheadLength = 5; // Length of arrowhead in percentage
  const arrowheadWidth = 5;  // Width of arrowhead in percentage
  
  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
      viewBox="0 0 100 100" // Set viewBox to use percentage coordinates
      preserveAspectRatio="none" // Ensures SVG scales to fit container
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
        x1={`${fromPos.x}%`}
        y1={`${fromPos.y}%`}
        x2={`${adjustedEnd.x}%`}
        y2={`${adjustedEnd.y}%`}
        stroke={arrowColor}
        strokeWidth={`${arrowThickness}%`}
        markerEnd="url(#arrowhead)"
      />
    </svg>
  );
};

export default BestMoveArrow;