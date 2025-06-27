import React, { useState, useMemo } from 'react';

// ... (interfaces remain the same) ...
type Point = [number, number];

interface ChessboardContours {
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

interface InteractiveChessboardProps {
  chessboardContours: ChessboardContours;
  originalDataBounds: BoundingBox;
  boundingBox: BoundingBox;
}

const InteractiveChessboard: React.FC<InteractiveChessboardProps> = ({
    chessboardContours,
    originalDataBounds,
    boundingBox,
}) => {
    const [selectedSquare, setSelectedSquare] = useState<ProcessedSquare | null>(null);

    const indexToChessNotation = (index: number): string => {
        const col = index % 8;
        const row = Math.floor(index / 8);
        const file = String.fromCharCode('A'.charCodeAt(0) + col);
        const rank = 8 - row;
        return `${file}${rank}`;
    };

    const { squares, viewBox } = useMemo(() => {
        const { x_min: minX, y_min: minY, x_max: maxX, y_max: maxY } = originalDataBounds;
        const originalWidth = maxX - minX;
        const originalHeight = maxY - minY;
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

        const tl = chessboardContours['top-left'];
        const tr = chessboardContours['top-right'];
        const br = chessboardContours['bottom-right'];
        const bl = chessboardContours['bottom-left'];

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
    }, [boundingBox, chessboardContours, originalDataBounds]); 

    const handleSquareClick = (square: ProcessedSquare) => {
        setSelectedSquare(square);
    };

    return (
        <>
            <svg 
                viewBox={viewBox} 
                className="fixed top-0 left-0 w-full h-full pointer-events-none"
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
                                style={{ pointerEvents: 'auto' }} // Re-enable pointer events for clickable polygons
                            />
                        );
                    })}
                </g>
            </svg>
        </>
    );
};

export default InteractiveChessboard;