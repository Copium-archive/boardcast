import { useEffect, useContext, useState, useRef, useCallback } from 'react';
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
  handleRemove?: () => void;
};

interface Coordinate {
    x: number;
    y: number;
}

// Draggable wrapper component with state and bounding box constraints
function DynamicChessOverlay({ 
  currentFen, 
  evaluation, 
  opacity = 1,
  movement = { move: null, progress: 1 },
  boundingBox,
  handleRemove
}: DynamicChessOverlayProps) {
	// Size ratio state
	const {sizeRatio, setSizeRatio, corner, setCorner} = useContext(VideoContext);

	// Calculate actual board size in pixels
	const boundingBoxWidth = boundingBox.x_max - boundingBox.x_min;
	const boundingBoxHeight = boundingBox.y_max - boundingBox.y_min;
	const actualBoardSize = sizeRatio * Math.min(boundingBoxWidth * (8/9), boundingBoxHeight);

	// Derived constants for pixel coordinates from percentile-based corner
	const corner_x = boundingBoxWidth * corner.x_offsetRatio;
	const corner_y = boundingBoxHeight * corner.y_offsetRatio;

	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState<Coordinate>({ x: 0, y: 0 });
	const overlayRef = useRef<HTMLDivElement>(null);

	// useEffect(() => {console.log("current drag offset", dragOffset)}, [dragOffset])

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
		
		// Calculate new corner relative to bounding box in pixels
		let newX = e.clientX - boundingBox.x_min - dragOffset.x;
		let newY = e.clientY - boundingBox.y_min - dragOffset.y;
		
		// Use actual board size for constraints instead of overlayRef dimensions
		const overlayWidth = actualBoardSize * (9/8); // aspect ratio is 9:8
		const overlayHeight = actualBoardSize;
		
		const maxX = boundingBoxWidth - overlayWidth;
		const maxY = boundingBoxHeight - overlayHeight;
		
		newX = Math.max(0, Math.min(newX, maxX));
		newY = Math.max(0, Math.min(newY, maxY));
		
		// Convert pixel coordinates to percentile-based coordinates
		const newXRatio = newX / boundingBoxWidth;
		const newYRatio = newY / boundingBoxHeight;
		
		setCorner({ x_offsetRatio: newXRatio, y_offsetRatio: newYRatio });
	}, [isDragging, dragOffset, boundingBoxWidth, boundingBoxHeight, actualBoardSize]);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	useEffect(() => {
		const overlayWidth = actualBoardSize * (9 / 8);
		const overlayHeight = actualBoardSize;

		let newX = corner_x;
		let newY = corner_y;

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
			// Convert pixel coordinates back to percentile-based coordinates
			const newXRatio = newX / boundingBoxWidth;
			const newYRatio = newY / boundingBoxHeight;
			setCorner({ x_offsetRatio: newXRatio, y_offsetRatio: newYRatio });
		}
	}, [sizeRatio, actualBoardSize, boundingBoxWidth, boundingBoxHeight, corner_x, corner_y]);

	// Centering functions
	const centerVertically = useCallback(() => {
		const overlayHeight = actualBoardSize;
		const centerY = (boundingBoxHeight - overlayHeight) / 2;
		const centerYRatio = centerY / boundingBoxHeight;
		setCorner(prev => ({ ...prev, y_offsetRatio: centerYRatio }));
	}, [actualBoardSize, boundingBoxHeight]);

	const centerHorizontally = useCallback(() => {
		const overlayWidth = actualBoardSize * (9/8);
		const centerX = (boundingBoxWidth - overlayWidth) / 2;
		const centerXRatio = centerX / boundingBoxWidth;
		setCorner(prev => ({ ...prev, x_offsetRatio: centerXRatio }));
	}, [actualBoardSize, boundingBoxWidth]);

	// Add and remove event listeners
	useEffect(() => {
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
						left: `${boundingBox.x_min + corner_x}px`,
						top: `${boundingBox.y_min + corner_y}px`,
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
				<ContextMenuItem 
					onClick={handleRemove} 
					className="text-red-600 focus:text-red-600"
					disabled={!handleRemove}
				>
					Remove Overlay
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export default DynamicChessOverlay;