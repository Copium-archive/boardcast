import React, { useContext, useState, useRef, useCallback } from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Slider } from '@/components/ui/slider';
import { VideoContext } from '@/components/VideoContainer';
import ChessOverlay from '@/components/ChessOverlay';

type ChessOverlayProps = {
  currentFen: string;
  evaluation: number | null;
  opacity?: number;
  size?:number;
  path_resolver?: (path: string) => string;
  movement?: {
    move: string | null;
    progress: number;
    previousFen?: string;
  };
};

type DynamicChessOverlayProps = Omit<ChessOverlayProps, 'sizeRatio'> & {
  boundingBox: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
};

interface Position {
    x: number;
    y: number;
}

// Draggable wrapper component with state and bounding box constraints
function DynamicChessOverlay({ 
  currentFen, 
  evaluation, 
  opacity = 1,
  movement = { move: null, progress: 1 },
  boundingBox
}: DynamicChessOverlayProps) {
	// Size ratio state
	const {sizeRatio, setSizeRatio} = useContext(VideoContext);

	// Calculate actual board size in pixels
	const boundingBoxWidth = boundingBox.x_max - boundingBox.x_min;
	const boundingBoxHeight = boundingBox.y_max - boundingBox.y_min;
	const actualBoardSize = sizeRatio * Math.min(boundingBoxWidth * (8/9), boundingBoxHeight);

	// Initialize position at top-left of bounding box
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
		if (!isDragging) return;
		
		// Calculate new position relative to bounding box
		let newX = e.clientX - boundingBox.x_min - dragOffset.x;
		let newY = e.clientY - boundingBox.y_min - dragOffset.y;
		
		// Use actual board size for constraints instead of overlayRef dimensions
		const overlayWidth = actualBoardSize * (9/8); // aspect ratio is 9:8
		const overlayHeight = actualBoardSize;
		
		const maxX = boundingBoxWidth - overlayWidth;
		const maxY = boundingBoxHeight - overlayHeight;
		
		newX = Math.max(0, Math.min(newX, maxX));
		newY = Math.max(0, Math.min(newY, maxY));
		
		setPosition({ x: newX, y: newY });
	}, [isDragging, dragOffset, boundingBox, actualBoardSize, boundingBoxWidth, boundingBoxHeight]);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

  React.useEffect(() => {
    const overlayWidth = actualBoardSize * (9 / 8);
    const overlayHeight = actualBoardSize;

    let newX = position.x;
    let newY = position.y;

    const maxX = boundingBoxWidth - overlayWidth;
    const maxY = boundingBoxHeight - overlayHeight;

    let changed = false;

    if (newX > maxX) {
      newX = Math.max(0, maxX);
      changed = true;
    }
    if (newY > maxY) {
      newY = Math.max(0, maxY);
      changed = true;
    }

    if (changed) {
      setPosition({ x: newX, y: newY });
    }
  }, [sizeRatio, actualBoardSize, boundingBoxWidth, boundingBoxHeight]);

	// Centering functions
	const centerVertically = useCallback(() => {
		const overlayHeight = actualBoardSize;
		const centerY = (boundingBoxHeight - overlayHeight) / 2;
		setPosition(prev => ({ ...prev, y: centerY }));
	}, [actualBoardSize, boundingBoxHeight]);

	const centerHorizontally = useCallback(() => {
		const overlayWidth = actualBoardSize * (9/8);
		const centerX = (boundingBoxWidth - overlayWidth) / 2;
		setPosition(prev => ({ ...prev, x: centerX }));
	}, [actualBoardSize, boundingBoxWidth]);

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
		<ContextMenu>
			<ContextMenuTrigger>
				<div 
					ref={overlayRef}
					className="cursor-move select-none"
					style={{ 
						position: 'fixed',
						left: `${boundingBox.x_min + position.x}px`,
						top: `${boundingBox.y_min + position.y}px`,
						transition: isDragging ? 'none' : 'transform 0.1s ease',
						zIndex: isDragging ? 50 : 10,
					}}
					onMouseDown={handleMouseDown}
				>
					<ChessOverlay
						currentFen={currentFen}
						evaluation={evaluation}
						opacity={opacity}
						size={actualBoardSize}
						movement={movement}
					/>
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-64">
				<ContextMenuItem onClick={centerHorizontally}>
					Center Horizontally
				</ContextMenuItem>
				<ContextMenuItem onClick={centerVertically}>
					Center Vertically
				</ContextMenuItem>
				<div className="px-2 py-3">
					<div className="text-sm font-medium mb-2">Size: {Math.round(sizeRatio * 100)}%</div>
					<Slider
						value={[sizeRatio]}
						onValueChange={(value) => setSizeRatio(value[0])}
						min={0.2}
						max={1}
						step={0.05}
						className="w-full"
					/>
				</div>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export default DynamicChessOverlay;