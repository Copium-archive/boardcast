import React, { useState, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
  originalDataBounds: BoundingBox;
  boundingBox: BoundingBox;
  editing: boolean;
}

const InteractiveChessboard: React.FC<InteractiveChessboardProps> = ({
    originalDataBounds,
    boundingBox,
    editing,
}) => {
    const [chessboardContours, setChessboardContours] = useState<ChessboardContours>({
        'top-left': [],
        'top-right': [],
        'bottom-right': [],
        'bottom-left': []
    });
    const [selectedSquare, setSelectedSquare] = useState<ProcessedSquare | null>(null);
    const [editingPoints, setEditingPoints] = useState<Point[]>([]);

useEffect(() => {
    const runScript = async () => {
        const corners = editingPoints.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`);
        const result = await invoke('run_python_script', {
            script: 'segmentation.py', 
            cliArgs: corners,
            osEnv: 'Windows', // or 'Wsl' depending on your setup
            jsonOutput: true // This will parse the JSON output from the Python script
        });

        setChessboardContours(result as ChessboardContours); // Cast to expected type if you are sure of the structure
    };
    if(editingPoints.length >= 4) {
        if(editingPoints.length === 4) {
            runScript();
        }
        setEditingPoints([]);
    }
}, [editingPoints]);

    const indexToChessNotation = (index: number): string => {
        const col = index % 8;
        const row = Math.floor(index / 8);
        const file = String.fromCharCode('A'.charCodeAt(0) + col);
        const rank = 8 - row;
        return `${file}${rank}`;
    };

    const { squares, viewBox, viewBoxRect } = useMemo(() => {
        // --- STEP 1: Calculate the viewBox based on the bounds props. ---
        // This is independent of the number of squares.
        const { x_min, y_min, x_max, y_max } = originalDataBounds;
        const width = x_max - x_min;
        const height = y_max - y_min;

        // If the bounds are invalid, return a completely empty state.
        if (!originalDataBounds || width <= 0 || height <= 0) {
            return {
                squares: [],
                viewBox: '0 0 0 0',
                viewBoxRect: { x: 0, y: 0, width: 0, height: 0 }
            };
        }

        const calculatedViewBox = `${x_min} ${y_min} ${width} ${height}`;
        const calculatedViewBoxRect = { x: x_min, y: y_min, width, height };

        // --- STEP 2: Dynamically determine the number of squares to process. ---
        const tl = chessboardContours['top-left'];
        const tr = chessboardContours['top-right'];
        const bl = chessboardContours['bottom-left'];
        const br = chessboardContours['bottom-right'];

        // Find the number of squares we can safely create. This is the minimum
        // length of all the contour arrays. If any are missing or empty, this will be 0.
        const numSquares = Math.min(
            tl?.length || 0,
            tr?.length || 0,
            bl?.length || 0,
            br?.length || 0
        );

        // --- STEP 3: Loop based on the dynamic number of squares. ---
        // If numSquares is 0, this will correctly create an empty array.
        const processedSquares: ProcessedSquare[] = Array.from({ length: numSquares }).map((_, i) => {
            // This code is now safe. We are guaranteed that tl[i], tr[i], etc., all exist
            // because we're only looping up to the minimum length.
            const points: SquarePoints = { tl: tl[i], tr: tr[i], br: br[i], bl: bl[i] };
            return {
                id: i,
                notation: indexToChessNotation(i),
                points: points,
                pointsString: `${points.tl.join(',')} ${points.tr.join(',')} ${points.br.join(',')} ${points.bl.join(',')}`,
            };
        });

        // --- STEP 4: Return the calculated viewBox and the dynamically generated squares. ---
        return {
            squares: processedSquares,
            viewBox: calculatedViewBox,
            viewBoxRect: calculatedViewBoxRect
        };
    }, [chessboardContours, originalDataBounds]);

    const handleSquareClick = (square: ProcessedSquare) => {
        if (!editing) {
            setSelectedSquare(square);
        }
    };

    const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!editing) return;

        const svg = event.currentTarget;
        const rect = svg.getBoundingClientRect();
        
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        const svgWidth = rect.width;
        const svgHeight = rect.height;
        const { x, y, width, height } = viewBoxRect;
        
        const viewBoxX = x + (clickX / svgWidth) * width;
        const viewBoxY = y + (clickY / svgHeight) * height;
        
        // Add the point to the editing points array
        const newPoint: Point = [viewBoxX, viewBoxY];
        setEditingPoints(prev => [...prev, newPoint]);
        
        console.log(`Added point at ViewBox coordinates: (${viewBoxX.toFixed(2)}, ${viewBoxY.toFixed(2)})`);
    };

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
                                e.stopPropagation();
                                handleSquareClick(square);
                            }}
                            className="cursor-pointer"
                            style={{ 
                                pointerEvents: editing ? 'none' : 'auto',
                                cursor: editing ? 'crosshair' : 'pointer',
                                // This makes the stroke width appear constant even if the SVG scales
                                vectorEffect: "non-scaling-stroke",
                            }}
                        />
                    ))}
                </g>
                
                {/* Render editing points */}
                {editing && editingPoints.map((point, index) => (
                    <circle
                        key={index}
                        cx={point[0]}
                        cy={point[1]}
                        r={3}
                        fill="red"
                        stroke="red"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                        style={{ pointerEvents: 'none' }}
                    />
                ))}
            </svg>
        </>
    );
};

export default InteractiveChessboard;