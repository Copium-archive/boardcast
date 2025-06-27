import React, { useState, useMemo, useEffect } from 'react';

// --- TYPE DEFINITIONS for TypeScript (unchanged) ---
type Point = [number, number];
// ... (rest of the type definitions are unchanged)
interface ChessboardData {
  'top-left': Point[];
  'top-right': Point[];
  'bottom-right': Point[];
  'bottom-left': Point[];
}
interface SquarePoints {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}
interface ProcessedSquare {
  id: number;
  notation: string;
  points: SquarePoints;
  pointsString: string;
}
interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

// --- NEW: Props interface for the component ---
interface InteractiveChessboardProps {
  chessboardData: ChessboardData;
  originalDataBounds: BoundingBox;
  boundingBox: BoundingBox;
}

const InteractiveChessboard: React.FC<InteractiveChessboardProps> = ({
    chessboardData,
    originalDataBounds,
    boundingBox,
}) => {
    // Selected square remains as internal state, as it doesn't need to be controlled from the outside.
    const [selectedSquare, setSelectedSquare] = useState<ProcessedSquare | null>(null);

    // This effect is useful for debugging to see when the boundingBox prop changes.
    useEffect(() => {console.log("Bounding Box Prop Updated:", boundingBox)}, [boundingBox]);

    const indexToChessNotation = (index: number): string => {
        const col = index % 8;
        const row = Math.floor(index / 8);
        const file = String.fromCharCode('A'.charCodeAt(0) + col);
        const rank = 8 - row;
        return `${file}${rank}`;
    };

    const { squares, viewBox } = useMemo(() => {
        // The data now comes from props instead of a hardcoded constant.
        const { x_min: minX, y_min: minY, x_max: maxX, y_max: maxY } = originalDataBounds;
        
        const originalWidth = maxX - minX;
        const originalHeight = maxY - minY;
        
        // The current bounding box size is derived from the boundingBox prop.
        const newWidth = boundingBox.x_max - boundingBox.x_min;
        const newHeight = boundingBox.y_max - boundingBox.y_min;

        if (originalWidth === 0 || originalHeight === 0) {
            return { squares: [], viewBox: '0 0 0 0' };
        }

        const scaleX = newWidth / originalWidth;
        const scaleY = newHeight / originalHeight;
        const uniformScale = Math.min(scaleX, scaleY);
        
        const finalBoardWidth = originalWidth * uniformScale;
        const finalBoardHeight = originalHeight * uniformScale;
        
        const offsetX = boundingBox.x_min + (newWidth - finalBoardWidth) / 2;
        const offsetY = boundingBox.y_min + (newHeight - finalBoardHeight) / 2;

        // Use the chessboardData prop
        const tl = chessboardData['top-left'];
        const tr = chessboardData['top-right'];
        const br = chessboardData['bottom-right'];
        const bl = chessboardData['bottom-left'];

        const processedSquares: ProcessedSquare[] = Array.from({ length: 64 }).map((_, i) => {
            const originalPoints: SquarePoints = { tl: tl[i], tr: tr[i], br: br[i], bl: bl[i] };
            
            const transform = (point: Point): Point => {
                const [x, y] = point;
                const relativeX = x - minX;
                const relativeY = y - minY;
                const scaledX = relativeX * uniformScale;
                const scaledY = relativeY * uniformScale;
                const finalX = offsetX + scaledX;
                const finalY = offsetY + scaledY;
                return [finalX, finalY];
            };
            
            const transformedPoints: SquarePoints = {
                tl: transform(originalPoints.tl),
                tr: transform(originalPoints.tr),
                br: transform(originalPoints.br),
                bl: transform(originalPoints.bl)
            };

            return {
                id: i,
                notation: indexToChessNotation(i),
                points: transformedPoints,
                pointsString: `${transformedPoints.tl.join(',')} ${transformedPoints.tr.join(',')} ${transformedPoints.br.join(',')} ${transformedPoints.bl.join(',')}`,
            };
        });
        
        const dynamicViewBox = `0 0 ${window.innerWidth} ${window.innerHeight}`;
        return { squares: processedSquares, viewBox: dynamicViewBox };
    // Dependency array is updated to include the new props.
    }, [boundingBox, chessboardData, originalDataBounds]); 

    const handleSquareClick = (square: ProcessedSquare) => {
        setSelectedSquare(square);
    };
    
    // The JSX remains largely the same, but now reads values from the `boundingBox` prop.
    return (
        <>
            <svg 
                viewBox={viewBox} 
                className="fixed top-0 left-0 w-full h-full pointer-events-auto"
                style={{ zIndex: 1 }}
            >
                <g>
                    {squares.map((square) => {
                        return (
                            <polygon
                                key={square.id}
                                points={square.pointsString}
                                fill="transparent"
                                stroke={selectedSquare?.id === square.id ? 'yellow' : 'red'}
                                strokeWidth={selectedSquare?.id === square.id ? 4 : 1}
                                onClick={() => handleSquareClick(square)}
                                className="cursor-pointer"
                            />
                        );
                    })}
                </g>
            </svg>
        </>
    );
};

export default InteractiveChessboard;