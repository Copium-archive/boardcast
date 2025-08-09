import React, { useState, useMemo, useEffect, useContext, forwardRef, useImperativeHandle } from 'react';
import { AppContext } from '@/App';
import { VideoContext } from './VideoContainer';
import { segmentChessboard, validateChessboardCorners } from '../lib/chessboard-segmentation';
import { Square } from 'chess.js';

type Point = [number, number];

interface OverlayType {
  fen?: string;
  moveIndex: number;
  timestamp: number;
}

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
  getPreviousPositionIndex: () => number | undefined;
}

// NEW: Define the type for the exposed imperative handles.
// This allows parent components to call methods on this component via a ref.
export interface InteractiveChessboardRef {
    finalize: () => void | undefined;
    skipToOrientation: () => void | undefined;
    clearEditingPoints: () => void | undefined;
}

function algebraicNotation(row: number, col: number): Square {
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = 8 - row;
  return (file + rank) as Square;
}

function rotatePosition(row: number, col: number, orientation: number) {
    let newRow = row;
    let newCol = col;

    for (let i = 0; i < orientation; i++) {
        const temp = newRow;
        newRow = 7 - newCol;
        newCol = temp;
    }

    return { row: newRow, col: newCol };
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

// MODIFIED: Wrapped the component in forwardRef to accept a ref.
const InteractiveChessboard = forwardRef<InteractiveChessboardRef, InteractiveChessboardProps>(({
    coord,
    boundingBox,
    getPreviousPositionIndex,
}, ref) => {
    const { isEditingContour, setIsEditingContour, 
        selectingOrientation, setSelectingOrientation, 
        boardOrientation,
        hoveredSquare, setHoveredSquare,
        setEnableDiscard,
        skippedToOrientation,
        chessboardRef,
        setCurrentMoveIndex,
        positions
    } = useContext(AppContext);
    const { videoRef, setROI, currentTime, createOverlay} = useContext(VideoContext);

    const previewBoardOrientation = (boardOrientation.current + boardOrientation.shifted) % 4;
    
    const [selectedSquare, setSelectedSquare] = useState<ProcessedSquare | null>(null);
    
    const [editingPoints, setEditingPoints] = useState<Point[]>([]);
    const sortedEditingPoints = (editingPoints.length === 4) ? orderCorners(editingPoints): editingPoints;
    const previewSquares = useMemo<ProcessedSquare[]>(() => {
        if (sortedEditingPoints.length !== 4) {
            return [];
        }

        try {
            const corners = sortedEditingPoints.map(([x, y]) => ({ x, y }));
            
            if (!validateChessboardCorners(corners)) {
                console.warn('Invalid chessboard corners for segmentation');
                return [];
            }

            const result = segmentChessboard(corners);
            
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
            
            return processedSquares;
        } catch (error) {
            console.error('Error in chessboard segmentation:', error);
            return [];
        }
    }, [sortedEditingPoints]);
    const previewBoardOutline = useMemo(() => {
        if (sortedEditingPoints.length !== 4) return '';
        return sortedEditingPoints.map(p => `${p[0]},${p[1]}`).join(' ');
    }, [sortedEditingPoints]);
    
    const [squares, setSquares] = useState<ProcessedSquare[]>([]);
    const [boardCorners, setBoardCorners] = useState<Point[]>([]);
    const boardOutline = useMemo(() => {
        if (boardCorners.length !== 4) return '';
        return boardCorners.map(p => `${p[0]},${p[1]}`).join(' ');
    }, [boardCorners]);

    const [pendingOverlay, setPendingOverlay] = useState<OverlayType|null>(null);

    useEffect(() => {
        if(pendingOverlay !== null) {
            const newOverlay = {
                fen: positions[pendingOverlay.moveIndex], 
                ...pendingOverlay
            }
            createOverlay(newOverlay);
            setCurrentMoveIndex(newOverlay.moveIndex); 
            setPendingOverlay(null);
        }
    }, [pendingOverlay]);
    
    const finalize = () => {
        try {
            if (!validateChessboardCorners(editingPoints.slice(0, 4).map(([x, y]) => ({ x, y })))) {
                console.warn('Invalid chessboard corners selected');
                return;
            }

            const cornersString = sortedEditingPoints.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`);
            setROI(cornersString);
            setBoardCorners(sortedEditingPoints);
            setSquares(previewSquares);
        } catch (error) {
            console.error('Error processing chessboard corners:', error);
        }
    }

    const skipToOrientation = () => {
        if(boardCorners.length < 4) return;
        skippedToOrientation.current = true;
        setIsEditingContour(true);
        setEditingPoints(boardCorners);
    }

    const clearEditingPoints = () => {
        setEditingPoints([]);
    }

    useImperativeHandle(ref, () => ({
        finalize,
        skipToOrientation,
        clearEditingPoints
    }));

    // Process chessboard segmentation when we have 4 points
    useEffect(() => { 
        if (editingPoints.length >= 4) {
            setSelectingOrientation(true);
            setIsEditingContour(false);
        }
    }, [editingPoints]);

    useEffect(() => { 
        if(isEditingContour) {
            if(editingPoints.length > 0) setEnableDiscard(true);
            else setEnableDiscard(false);
        }
        else {
            setEnableDiscard(false);
        }
    }, [editingPoints, isEditingContour]);

    
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
                if(selectedSquare.id === square.id) {
                    setSelectedSquare(null);
                    return;
                }
                const prevMoveIndex = getPreviousPositionIndex();
                if (prevMoveIndex === undefined) {
                    return;
                }
                const to_square = rotatePosition(selectedSquare.square.row, selectedSquare.square.col, previewBoardOrientation);
                const from_square = rotatePosition(square.square.row, square.square.col, previewBoardOrientation);
                const from = algebraicNotation(from_square.row, from_square.col);
                const to = algebraicNotation(to_square.row, to_square.col);
                chessboardRef.current?.insertMove(from, to, prevMoveIndex, () => {
                    setPendingOverlay({
                        moveIndex: (prevMoveIndex+1),
                        timestamp: currentTime
                    })
                });
                // setPendingOverlay({
                //     moveIndex: (prevMoveIndex+1),
                //     timestamp: currentTime
                // })
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
        // FIXED: Prevent adding more than 4 points
        setEditingPoints(prev => prev.length < 4 ? [...prev, newPoint] : prev);
    };

    const handlePointClick = (event: React.MouseEvent, indexToRemove: number) => {
        // Prevent the main SVG click handler from firing and adding a new point.
        event.stopPropagation();
    
        if (isEditingContour) {
            setEditingPoints(prevPoints => prevPoints.filter((_, i) => i !== indexToRemove));
        }
    };
    
    useEffect(() => {
        if (!videoRef.current?.paused) {
            clearEditingPoints();
            setSelectedSquare(null);
        }
    }, [currentTime, videoRef]);    
    
    const svgStyle: React.CSSProperties = {
        position: 'fixed',
        left: `${boundingBox.x_min}px`,
        top: `${boundingBox.y_min}px`,
        width: `${boundingBox.x_max - boundingBox.x_min}px`,
        height: `${boundingBox.y_max - boundingBox.y_min}px`,
        pointerEvents: isEditingContour || selectingOrientation ? 'auto' : 'none',
        zIndex: 1,
        cursor: isEditingContour ? 'crosshair' : 'default',
    };
    
    // Memoize points for the segmentation effect
    const segmentationEffectPoints = useMemo(() => {
        if (!selectingOrientation || sortedEditingPoints.length !== 4 || !coord) return null;

        const boardTopRight = sortedEditingPoints[1]; // Get top-right from ordered corners
        const viewboxTopRight: Point = [coord.x_max+2, (coord.x_max / 10)];

        return {
            arrowStart: viewboxTopRight,
            arrowEnd: boardTopRight,
        };
    }, [selectingOrientation, sortedEditingPoints, coord]);

    return (
        <>
            <svg 
                viewBox={viewBox} 
                style={svgStyle}
                preserveAspectRatio="xMidYMid meet"
                onClick={handleSvgClick}
            >

                {/* Segmentation loading/highlighting effect */}
                {selectingOrientation && segmentationEffectPoints && (
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
                                <polygon points={previewBoardOutline} fill="black" />
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
                {!isEditingContour && boardOutline && !selectingOrientation && (
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

                {/* Chess squares preview */}
                <g>
                    {selectingOrientation && previewSquares.map((square) => {
                        const isSelected = selectedSquare?.id === square.id;
                        const rotatedSquarePos = rotatePosition(square.square.row, square.square.col, previewBoardOrientation);
                        const isHovered =
                            hoveredSquare &&
                            rotatedSquarePos.row === hoveredSquare.row &&
                            rotatedSquarePos.col === hoveredSquare.col;

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
                                onMouseEnter={() => setHoveredSquare({row: rotatedSquarePos.row, col: rotatedSquarePos.col})}
                                onMouseLeave={() => setHoveredSquare(null)}
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

                {/* Chess squares*/}
                <g>
                    {!isEditingContour && !selectingOrientation && squares.map((square) => {
                        const isSelected = selectedSquare?.id === square.id;
                        const rotatedSquarePos = rotatePosition(square.square.row, square.square.col, previewBoardOrientation);
                        const isHovered =
                            hoveredSquare &&
                            rotatedSquarePos.row === hoveredSquare.row &&
                            rotatedSquarePos.col === hoveredSquare.col;

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
                                onMouseEnter={() => setHoveredSquare({row: rotatedSquarePos.row, col: rotatedSquarePos.col})}
                                onMouseLeave={() => setHoveredSquare(null)}
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

                {!selectingOrientation && (
                    <>
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
                                    onClick={(e) => handlePointClick(e, index)}
                                    style={{ 
                                        pointerEvents: 'auto',
                                        cursor: 'pointer'
                                    }}
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
                        <g>
                            {sortedEditingPoints.map((point, index) => {
                                const nextIndex = (index + 1) % sortedEditingPoints.length;

                                if (index === sortedEditingPoints.length - 1 && sortedEditingPoints.length < 3) {
                                    return null; // Skip wrapping line unless there are 4 points
                                }

                                const nextPoint = sortedEditingPoints[nextIndex];

                                return (
                                    <line
                                        key={`line-${index}`}
                                        x1={point[0]}
                                        y1={point[1]}
                                        x2={nextPoint[0]}
                                        y2={nextPoint[1]}
                                        stroke="#3b82f6"
                                        strokeWidth={4}
                                        strokeDasharray="8,4"
                                        vectorEffect="non-scaling-stroke"
                                        style={{
                                            pointerEvents: 'none',
                                            filter: 'drop-shadow(0 0 1px #fff)',
                                        }}
                                    />
                                );
                            })}
                        </g>
                    </>
                )}
            </svg>
        </>
    );
});

InteractiveChessboard.displayName = 'InteractiveChessboard';

export default InteractiveChessboard;