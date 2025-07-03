import React, { useState, useMemo, useEffect, useContext } from 'react';
import { AppContext } from '@/App';
import { VideoContext } from './VideoContainer';
import { invoke } from '@tauri-apps/api/core';

type Point = [number, number];

interface Contour {
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

interface Coord {
  x_max: number;
  y_max: number;
}

interface InteractiveChessboardProps {
  coord: Coord;
  boundingBox: BoundingBox;
  editing: boolean;
}

const InteractiveChessboard: React.FC<InteractiveChessboardProps> = ({
    coord,
    boundingBox,
    editing,
}) => {
    const { isEditingContour, setIsEditingContour, setExecutingSegmentation} = useContext(AppContext);
    const { setROI} = useContext(VideoContext)
    const [boardContours, setBoardContours] = useState<Contour>({
        'top-left': [],
        'top-right': [],
        'bottom-right': [],
        'bottom-left': []
    });
    
    const [selectedSquare, setSelectedSquare] = useState<ProcessedSquare | null>(null);
    const [editingPoints, setEditingPoints] = useState<Point[]>([]);

    useEffect(() => {
        if(editingPoints.length >= 4) {
            setIsEditingContour(false);
            setExecutingSegmentation(true);
        }
    }, [editingPoints]);
        
    useEffect(() => {
        const runScript = async () => {
            if(editingPoints.length < 4) {
                setEditingPoints([]); 
                setExecutingSegmentation(false);
                return;
            }
            const corners = editingPoints.slice(0, 4).map(([x, y]) => `${Math.round(x)},${Math.round(y)}`);
            console.log("supposed ROI", corners)
            setROI(corners)
            const result = await invoke('run_python_script', {
                script: 'segmentation.py', 
                cliArgs: corners,
                osEnv: 'Windows', // or 'Wsl' depending on your setup
                jsonOutput: true // This will parse the JSON output from the Python script
            });

            setBoardContours(result as Contour); 
            setEditingPoints([]); 
            setExecutingSegmentation(false);
        };

        if(isEditingContour === false) {
            runScript();
        }
    }, [isEditingContour]);

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
        const { x_max, y_max } = coord;
        const width = x_max;
        const height = y_max;

        // If the bounds are invalid, return a completely empty state.
        if (!coord || width <= 0 || height <= 0) {
            return {
                squares: [],
                viewBox: '0 0 0 0',
                viewBoxRect: { x: 0, y: 0, width: 0, height: 0 }
            };
        }

        // ViewBox starts at origin (0,0) with the specified width and height
        const calculatedViewBox = `0 0 ${width} ${height}`;
        const calculatedViewBoxRect = { x: 0, y: 0, width, height };

        // --- STEP 2: Dynamically determine the number of squares to process. ---
        const tl = boardContours['top-left'];
        const tr = boardContours['top-right'];
        const bl = boardContours['bottom-left'];
        const br = boardContours['bottom-right'];

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
            viewBoxRect: calculatedViewBoxRect,
        };
    }, [boardContours, coord]);

    const handleSquareClick = (square: ProcessedSquare) => {
        if (!editing) {
            setSelectedSquare(square);
        }
    };

    const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!editing) return;

        const svg = event.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;

        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

        // Ensure coordinates are non-negative
        const x = Math.max(0, svgP.x);
        const y = Math.max(0, svgP.y);

        const newPoint: Point = [x, y];
        setEditingPoints(prev => [...prev, newPoint]);

        console.log(`SVG coordinates: (${x}, ${y})`);
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
                {/* Debug rectangle to show the full viewBox bounds */}
                <rect
                    x={viewBoxRect.x}
                    y={viewBoxRect.y}
                    width={viewBoxRect.width}
                    height={viewBoxRect.height}
                    fill="none"
                    stroke="blue"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: 'none' }}
                />
                
                <g>
                    {!isEditingContour && squares.map((square) => (
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
                                vectorEffect: "non-scaling-stroke",
                            }}
                        />
                    ))}
                </g>
                
                {editingPoints.map((point, index) => (
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