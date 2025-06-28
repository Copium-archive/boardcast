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
  editing: boolean;
}

const InteractiveChessboard: React.FC<InteractiveChessboardProps> = ({
    chessboardContours,
    originalDataBounds,
    boundingBox,
    editing,
}) => {
    const [selectedSquare, setSelectedSquare] = useState<ProcessedSquare | null>(null);

    const indexToChessNotation = (index: number): string => {
        const col = index % 8;
        const row = Math.floor(index / 8);
        const file = String.fromCharCode('A'.charCodeAt(0) + col);
        const rank = 8 - row;
        return `${file}${rank}`;
    };

    // REFACTORED useMemo hook
    const { squares, viewBox } = useMemo(() => {
        // 1. Define the viewBox directly from the original data's bounds.
        // This tells the SVG what its internal coordinate system is.
        const { x_min, y_min, x_max, y_max } = originalDataBounds;
        const width = x_max - x_min;
        const height = y_max - y_min;
        
        if (width === 0 || height === 0) {
            return { squares: [], viewBox: '0 0 0 0' };
        }

        const calculatedViewBox = `${x_min} ${y_min} ${width} ${height}`;

        const tl = chessboardContours['top-left'];
        const tr = chessboardContours['top-right'];
        const bl = chessboardContours['bottom-left'];
        const br = chessboardContours['bottom-right'];

        // 2. Process squares without any transformation.
        // The points are now in the same coordinate system as the viewBox,
        // so we can use them directly.
        const processedSquares: ProcessedSquare[] = Array.from({ length: 64 }).map((_, i) => {
            const points: SquarePoints = { tl: tl[i], tr: tr[i], br: br[i], bl: bl[i] };
            return {
                id: i,
                notation: indexToChessNotation(i),
                points: points, // No more transformation needed!
                pointsString: `${points.tl.join(',')} ${points.tr.join(',')} ${points.br.join(',')} ${points.bl.join(',')}`,
            };
        });
        
        return { squares: processedSquares, viewBox: calculatedViewBox };
    }, [chessboardContours, originalDataBounds]); // Dependency on `boundingBox` is removed

    const handleSquareClick = (square: ProcessedSquare) => {
        if (!editing) {
            setSelectedSquare(square);
        }
    };

    // Handle SVG canvas clicks in editing mode
    const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!editing) return;

        const svg = event.currentTarget;
        const rect = svg.getBoundingClientRect();
        
        // Get click position relative to the SVG element
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // Convert to viewBox coordinates
        const svgWidth = rect.width;
        const svgHeight = rect.height;
        const { x_min, y_min } = originalDataBounds;
        const viewBoxWidth = originalDataBounds.x_max - originalDataBounds.x_min;
        const viewBoxHeight = originalDataBounds.y_max - originalDataBounds.y_min;
        
        const viewBoxX = x_min + (clickX / svgWidth) * viewBoxWidth;
        const viewBoxY = y_min + (clickY / svgHeight) * viewBoxHeight;
        
        console.log(`ViewBox coordinates: (${viewBoxX.toFixed(2)}, ${viewBoxY.toFixed(2)})`);
    };

    // 3. Use the boundingBox to style the <svg> element itself.
    // This positions and sizes the SVG on the page. The browser will handle
    // fitting the `viewBox` content inside these dimensions.
    const svgStyle: React.CSSProperties = {
        position: 'fixed',
        left: `${boundingBox.x_min}px`,
        top: `${boundingBox.y_min}px`,
        width: `${boundingBox.x_max - boundingBox.x_min}px`,
        height: `${boundingBox.y_max - boundingBox.y_min}px`,
        pointerEvents: editing ? 'auto' : 'none',
        zIndex: 1,
        cursor: editing ? 'crosshair' : 'default',
    };

    return (
        <>
            <svg 
                viewBox={viewBox} 
                style={svgStyle}
                preserveAspectRatio="xMidYMid meet"
                onClick={handleSvgClick}
            >
                <g>
                    {squares.map((square) => (
                        <polygon
                            key={square.id}
                            points={square.pointsString}
                            fill="transparent"
                            stroke={selectedSquare?.id === square.id ? 'yellow' : 'red'}
                            strokeWidth={selectedSquare?.id === square.id ? 4 : 1}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent SVG click handler from firing
                                handleSquareClick(square);
                            }}
                            className="cursor-pointer"
                            style={{ 
                                pointerEvents: editing ? 'none' : 'auto',
                                cursor: editing ? 'crosshair' : 'pointer'
                            }}
                        />
                    ))}
                </g>
            </svg>
        </>
    );
};

export default InteractiveChessboard;