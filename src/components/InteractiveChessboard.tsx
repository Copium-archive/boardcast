import React, { useState, useMemo, useEffect, useContext} from 'react';
import { AppContext } from '@/App';
import { VideoContext } from './VideoContainer';
import { segmentChessboard, validateChessboardCorners } from '../lib/chessboard-segmentation';


type Point = [number, number];

interface ProcessedSquare {
  id: number;
  square: {
    row: number;
    col: number;
  };
  corners: {
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  };
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
}

function orderCorners(corners: Point[]): Point[] {
    if (corners.length !== 4) {
        throw new Error('Exactly 4 corners are required');
    }

    // Sort by y coordinate (ascending)
    const sortedByY = [...corners].sort((a, b) => a[1] - b[1]);
    const topPoints = sortedByY.slice(0, 2).sort((a, b) => a[0] - b[0]);
    const bottomPoints = sortedByY.slice(2, 4).sort((a, b) => a[0] - b[0]);

    return [
        topPoints[0],    // top-left
        topPoints[1],    // top-right
        bottomPoints[1], // bottom-right
        bottomPoints[0]  // bottom-left
    ];
}

const InteractiveChessboard: React.FC<InteractiveChessboardProps> = ({
    coord,
    boundingBox,
}) => {
    const { isEditingContour, setIsEditingContour, executingSegmentation, setExecutingSegmentation } = useContext(AppContext);
    const { videoRef, setROI, currentTime } = useContext(VideoContext);
    
    const [hoveredSquareId, setHoveredSquareId] = useState<number | null>(null);
    const [selectedSquare, setSelectedSquare] = useState<ProcessedSquare | null>(null);
    
    const [editingPoints, setEditingPoints] = useState<Point[]>([]);
    const [squares, setSquares] = useState<ProcessedSquare[]>([]);
    const [finalBoardCorners, setFinalBoardCorners] = useState<Point[]>([]);

    const boardOutline = useMemo(() => {
        if (finalBoardCorners.length !== 4) return '';
        return finalBoardCorners.map(p => `${p[0]},${p[1]}`).join(' ');
    }, [finalBoardCorners]);

    // Process chessboard segmentation when we have 4 points
    useEffect(() => {
        if (editingPoints.length >= 4) {
            setIsEditingContour(false);
            setExecutingSegmentation(true);
        }
    }, [editingPoints]);

    // Run segmentation when editing is complete
    useEffect(() => {
        const processChessboard = () => {
            if (editingPoints.length < 4) {
                setEditingPoints([]);
                return;
            }

            try {
                // Convert points to the format expected by the segmentation function
                const corners = editingPoints.slice(0, 4).map(([x, y]) => ({ x, y }));
                
                // Validate corners
                if (!validateChessboardCorners(corners)) {
                    console.warn('Invalid chessboard corners selected');
                    setEditingPoints([]);
                    return;
                }

                // Set ROI for video context
                const cornersString = corners.map(({ x, y }) => `${Math.round(x)},${Math.round(y)}`);
                console.log("ROI corners:", cornersString);
                setROI(cornersString);

                // Order and store the final corners for the visual effect
                const orderedCorners = orderCorners(editingPoints.slice(0, 4));
                
                // Perform segmentation
                const result = segmentChessboard(corners);
                
                // Convert to the format expected by the component
                const processedSquares: ProcessedSquare[] = result.squares.map(square => ({
                    id: square.id,
                    square: square.square,
                    corners: {
                        topLeft: [square.corners.topLeft.x, square.corners.topLeft.y],
                        topRight: [square.corners.topRight.x, square.corners.topRight.y],
                        bottomRight: [square.corners.bottomRight.x, square.corners.bottomRight.y],
                        bottomLeft: [square.corners.bottomLeft.x, square.corners.bottomLeft.y]
                    },
                    pointsString: [
                        square.corners.topLeft,
                        square.corners.topRight,
                        square.corners.bottomRight,
                        square.corners.bottomLeft
                    ].map(p => `${p.x},${p.y}`).join(' ')
                }));
                
                setFinalBoardCorners(orderedCorners);
                setSquares(processedSquares);
                setEditingPoints([]);
            } catch (error) {
                console.error('Error in chessboard segmentation:', error);
            }
        };

        if (isEditingContour === false) {
            processChessboard();
        }
    }, [isEditingContour]);

    
    const viewBox = useMemo(() => {
        const { x_max, y_max } = coord;
        const width = x_max;
        const height = y_max;
        
        if (!coord || width <= 0 || height <= 0) {
            return '0 0 0 0';
        }
        
        return `0 0 ${width} ${height}`;
    }, [coord]);
    
    const handleSquareClick = (square: ProcessedSquare) => {
        if (!isEditingContour) {
            videoRef.current?.pause();
            if(selectedSquare === null) {
                setSelectedSquare(square);
            }
            else {
                setSelectedSquare(null);
            }
        }
    };
    
    const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!isEditingContour) return;
        
        videoRef.current?.pause(); 
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
    };
    
    useEffect(() => {
        if (!videoRef.current?.paused) {
            setEditingPoints([]);
            setSelectedSquare(null);
        }
    }, [currentTime, videoRef]);    
    
    const svgStyle: React.CSSProperties = {
        position: 'fixed',
        left: `${boundingBox.x_min}px`,
        top: `${boundingBox.y_min}px`,
        width: `${boundingBox.x_max - boundingBox.x_min}px`,
        height: `${boundingBox.y_max - boundingBox.y_min}px`,
        pointerEvents: isEditingContour || executingSegmentation ? 'auto' : 'none',
        zIndex: 1,
        cursor: isEditingContour ? 'crosshair' : 'default',
    };
    
    // Memoize points for the segmentation effect
    const segmentationEffectPoints = useMemo(() => {
        if (!executingSegmentation || finalBoardCorners.length !== 4 || !coord) return null;

        const boardTopRight = finalBoardCorners[1]; // Get top-right from ordered corners
        const viewboxTopRight: Point = [coord.x_max+2, (coord.x_max / 10)];

        return {
            arrowStart: viewboxTopRight,
            arrowEnd: boardTopRight,
        };
    }, [executingSegmentation, finalBoardCorners, coord]);

    return (
        <>
            <svg 
                viewBox={viewBox} 
                style={svgStyle}
                preserveAspectRatio="xMidYMid meet"
                onClick={handleSvgClick}
            >

                {/* Segmentation loading/highlighting effect */}
                {executingSegmentation && segmentationEffectPoints && (
                    <g>
                        <defs>
                            {/* Define the arrowhead marker */}
                            <marker
                                id="arrowhead"
                                viewBox="0 0 10 10"
                                refX="8"
                                refY="5"
                                markerWidth="6"
                                markerHeight="6"
                                orient="auto-start-reverse"
                            >
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
                            </marker>
                            {/* 
                                Define the mask.
                                The mask is white by default, making everything under it visible.
                                We draw black shapes (the board and arrow) on the mask.
                                The black areas become "holes", making the overlay transparent there.
                            */}
                            <mask id="segmentation-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                <polygon points={boardOutline} fill="black" />
                            </mask>
                        </defs>
                        
                        {/* The dark overlay that covers everything */}
                        <rect
                            x="0"
                            y="0"
                            width="100%"
                            height="100%"
                            fill="rgba(0, 20, 40, 0.7)"
                            mask="url(#segmentation-mask)"
                            style={{ pointerEvents: 'none' }}
                        />
                        
                        {/* The visible arrow drawn on top of the overlay */}
                        <line
                            x1={segmentationEffectPoints.arrowStart[0]}
                            y1={segmentationEffectPoints.arrowStart[1]}
                            x2={segmentationEffectPoints.arrowEnd[0]}
                            y2={segmentationEffectPoints.arrowEnd[1]}
                            stroke="#60a5fa"
                            strokeWidth={4}
                            vectorEffect="non-scaling-stroke"
                            strokeDasharray="5,5"
                            markerEnd="url(#arrowhead)"
                            style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 2px #fff)' }}
                        />
                    </g>
                )}

                {/* Chessboard outline */}
                {!isEditingContour && boardOutline && !executingSegmentation && (
                    <polygon
                        points={boardOutline}
                        fill="transparent"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="5,5"
                        style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 1px #fff)' }}
                    />
                )}

                {/* Chess squares */}
                <g>
                    {!isEditingContour && !executingSegmentation && squares.map((square) => {
                        const isSelected = selectedSquare?.id === square.id;
                        const isHovered = hoveredSquareId === square.id;
                        return (
                            <polygon
                                key={square.id}
                                points={square.pointsString}
                                fill="transparent"
                                stroke={isSelected ? '#3b82f6' : '#60a5fa'}
                                strokeWidth={(isSelected || isHovered) ? 4 : 0}
                                strokeDasharray={(isHovered && !isSelected) ? '8,4' : '0'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSquareClick(square);
                                }}
                                onMouseEnter={() => setHoveredSquareId(square.id)}
                                onMouseLeave={() => setHoveredSquareId(null)}
                                className="cursor-pointer"
                                style={{
                                    pointerEvents: isEditingContour ? 'none' : 'auto',
                                    cursor: isEditingContour ? 'crosshair' : 'pointer',
                                    vectorEffect: "non-scaling-stroke",
                                    filter: isHovered ? 'drop-shadow(0 0 1px #fff)' : 'none',
                                }}
                            />
                        );
                    })}
                </g>
                
                {/* Corner points being edited */}
                {editingPoints.map((point, index) => (
                    <g key={index}>
                        <circle
                            cx={point[0]}
                            cy={point[1]}
                            r={5}
                            fill="#3b82f6"
                            stroke="white"
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                            style={{ pointerEvents: 'none' }}
                        />
                        <text
                            x={point[0]}
                            y={point[1] - 10}
                            fill="white"
                            fontSize="12"
                            textAnchor="middle"
                            style={{ pointerEvents: 'none' }}
                        >
                            {index + 1}
                        </text>
                    </g>
                ))}
                
                {/* Connect the corner points with lines */}
                {editingPoints.length > 1 && (
                    <g>
                    {editingPoints.map((point, index) => {
                        if (index === 0) return null;
                        const prevPoint = editingPoints[index - 1];
                        return (
                        <line
                            key={`line-${index}`}
                            x1={prevPoint[0]}
                            y1={prevPoint[1]}
                            x2={point[0]}
                            y2={point[1]}
                            stroke="#3b82f6"
                            strokeWidth={4}
                            strokeDasharray="8,4"
                            vectorEffect="non-scaling-stroke"
                            style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 1px #fff)' }}
                        />
                        );
                    })}
                    {editingPoints.length === 4 && (
                        <line
                        x1={editingPoints[3][0]}
                        y1={editingPoints[3][1]}
                        x2={editingPoints[0][0]}
                        y2={editingPoints[0][1]}
                        stroke="#f59e42"
                        strokeWidth={4}
                        strokeDasharray="8,4"
                        vectorEffect="non-scaling-stroke"
                        style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 1px #fff)' }}
                        />
                    )}
                    </g>
                )}
            </svg>
        </>
    );
};

export default InteractiveChessboard;