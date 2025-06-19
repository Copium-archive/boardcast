import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import Timeline from "./TimeLine";
import { AppContext } from "@/App";
import DynamicChessOverlay from "./DynamicChessOverlay";

interface Offset {
    x_offsetRatio: number;
    y_offsetRatio: number;
}

interface VideoContainerProps {
  videoPath: string | null;
}

interface OverlayType {
  fen?: string;
  moveIndex?: number;
  timestamp: number;
}


interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

// Define the ref interface for parent component access
export interface VideoContainerRef {
  calculateBoardSize: () => number | undefined;
}

interface VideoContextType {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  checkpoints: number[];
  setCheckpoints: React.Dispatch<React.SetStateAction<number[]>>;
  createCheckpoint: (timestamp: number) => void;
  sizeRatio: number;
  setSizeRatio: React.Dispatch<React.SetStateAction<number>>;
  corner: Offset;
  setCorner: React.Dispatch<React.SetStateAction<Offset>>;
}

export const VideoContext = React.createContext<VideoContextType>({
  isPlaying: false,
  setIsPlaying: () => {},
  currentTime: 0,
  setCurrentTime: () => {},
  checkpoints: [],
  setCheckpoints: () => {},
  createCheckpoint: () => {},
  sizeRatio: 0.8,
  setSizeRatio: () => {},
  corner: { x_offsetRatio: 0, y_offsetRatio: 0 },
  setCorner: () => {}
});

const VideoContainer = forwardRef<VideoContainerRef, VideoContainerProps>(({ videoPath }, ref) => {
  const { positions, currentMoveIndex, setTimestamps} = React.useContext(AppContext);
  const [corner, setCorner] = useState<Offset>({ x_offsetRatio: 0, y_offsetRatio: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoBoundingBox, setVideoBoundingBox] = useState<BoundingBox>({
    x_min: 0,
    y_min: 0,
    x_max: 0,
    y_max: 0
  });
  
  const [overlays, setOverlays] = useState<OverlayType[]>([{timestamp: -1}]);
  const [currentOverlayId, setCurrentOverlayId] = useState<number>(0);
  const [checkpoints, setCheckpoints] = useState<number[]>([]);
  const [sizeRatio, setSizeRatio] = useState(0.8);

  const calculateBoardSize = () => {
    if(!videoRef.current) return;
    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;
    return Math.min(width * 8/9, height) * sizeRatio;
  }

  // Expose calculateBoardSize to parent component
  useImperativeHandle(ref, () => ({
    calculateBoardSize
  }));

  const createCheckpoint = (timestamp: number) => {
    if (!isVideoLoaded && !!videoPath) return;

    // Round timestamp to 1 decimal place
    const roundedTimestamp = Math.round(timestamp * 10) / 10;

    // Check if a checkpoint already exists at this timestamp (within 0.1 seconds tolerance)
    const existingCheckpoint = checkpoints.find(cp => Math.abs(cp - roundedTimestamp) < 0.1);
    if (existingCheckpoint) return;

    setCheckpoints(prev => {
      const updated = [...prev, roundedTimestamp];
      updated.sort((a, b) => a - b);
      return updated;
    });
  };
  
  // Function to update video bounding box
  const updateVideoBoundingBox = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const rect = video.getBoundingClientRect();

    const displayedWidth = rect.width;
    const displayedHeight = rect.height;
    const intrinsicWidth = video.videoWidth;
    const intrinsicHeight = video.videoHeight;

    if (!intrinsicWidth || !intrinsicHeight) return;

    // Determine scaling
    const widthRatio = displayedWidth / intrinsicWidth;
    const heightRatio = displayedHeight / intrinsicHeight;

    // Use the smaller ratio to preserve aspect
    const scale = Math.min(widthRatio, heightRatio);
    const renderedWidth = intrinsicWidth * scale;
    const renderedHeight = intrinsicHeight * scale;

    // Centering offset (in case of letterboxing)
    const offsetX = (displayedWidth - renderedWidth) / 2;
    const offsetY = (displayedHeight - renderedHeight) / 2;

    // Final coordinates of the actual video content
    const x_min = rect.left + offsetX;
    const y_min = rect.top + offsetY;
    const x_max = x_min + renderedWidth;
    const y_max = y_min + renderedHeight;

    setVideoBoundingBox({
      x_min,
      y_min,
      x_max,
      y_max
    });
  };

  useEffect(() => {
    // Reset state when video changes
    console.log("Video path changed:", videoPath);
    setIsVideoLoaded(false);
    setDuration(0);
  }, [videoPath]);

  useEffect(() => {
    // Update bounding box when video loads
    if (isVideoLoaded) {
      updateVideoBoundingBox();
    }
  }, [isVideoLoaded]);

  useEffect(() => {
    // Update bounding box when video element resizes
    if (!videoRef.current || !isVideoLoaded) return;

    const resizeObserver = new ResizeObserver(() => {
      updateVideoBoundingBox();
    });

    resizeObserver.observe(videoRef.current);

    // Cleanup observer on unmount or when dependencies change
    return () => {
      resizeObserver.disconnect();
    };
  }, [isVideoLoaded]);

  useEffect(() => {
    // Update bounding box as user scrolls
    if (!isVideoLoaded) return;

    const handleScroll = () => {
      updateVideoBoundingBox();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isVideoLoaded]);

  useEffect(() => {
    // Find the most recent overlay with timestamp <= currentTime
    let latestIndex = 0;
    for (let i = 0; i < overlays.length; i++) {
      if (overlays[i].timestamp <= currentTime) {
        latestIndex = i;
      } else {
        break;
      }
    }
    setCurrentOverlayId(latestIndex);
  }, [overlays]);

  useEffect(() => {
    let latestIndex = currentOverlayId;
    if(overlays[currentOverlayId].timestamp <= currentTime) {
      for (let i = currentOverlayId; i < overlays.length; i++) {
        if (overlays[i].timestamp <= currentTime) {
          latestIndex = i;
        } else {
          break;
        }
      }
    }
    else {
      for (let i = currentOverlayId; i >= 0; i--) {
        if (overlays[i].timestamp <= currentTime) {
          latestIndex = i;
          break;
        }
      }
    }
    setCurrentOverlayId(latestIndex);
  }, [currentTime]);

  const handleVideoMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsVideoLoaded(true);
    }
  };

  const handleOverlaying = () => {
    if(videoRef.current) {
      if(isPlaying === true) {
        return ;
      }
      setTimestamps((prev: (number | null)[]) => {
        const updated = [...prev];
        updated[currentMoveIndex] = currentTime;
        return updated;
      });
      setOverlays((prev = []) => {
        const newOverlay = {
          fen: positions[currentMoveIndex], // assuming positions[] holds FEN strings
          moveIndex : currentMoveIndex, 
          timestamp: currentTime,
        };
        const updated = [...prev, newOverlay];
        updated.sort((a, b) => a.timestamp - b.timestamp);
        return updated;
      });
      createCheckpoint(currentTime)
    }
  }

  const handleRemoveOverlay = () => {
    setOverlays((prev) => {
      const updated = [...prev];
      updated.splice(currentOverlayId, 1);
      return updated;
    });
    setCurrentOverlayId(0);
  }

  return (
      <VideoContext.Provider value={{ 
        isPlaying, setIsPlaying,
        currentTime, setCurrentTime,
        checkpoints, setCheckpoints,
        createCheckpoint, 
        sizeRatio, setSizeRatio,
        corner, setCorner}}>
        <div className="flex flex-col justify-center items-center w-full">
          <div className="w-full max-w-full aspect-video bg-black rounded-t-lg relative" onDoubleClick={handleOverlaying}>
            {overlays[currentOverlayId].fen && (videoBoundingBox.x_max - videoBoundingBox.x_min) > 0 && (videoBoundingBox.y_max - videoBoundingBox.y_min) > 0 ? (
              <DynamicChessOverlay 
              currentFen={overlays[currentOverlayId].fen} 
              evaluation={null} 
              opacity={overlays[currentOverlayId].timestamp === currentTime ? 1 : 0.6}
              boundingBox={videoBoundingBox}
              handleRemove={overlays[currentOverlayId].timestamp === currentTime ? handleRemoveOverlay : undefined}
              />
            ) : null}
            
            {videoPath ? (
              <video
                ref={videoRef}
                className="w-full h-full rounded-t-lg"
                src={videoPath}
                onLoadedMetadata={handleVideoMetadata}
                // Remove default controls attribute to use our custom timeline
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="text-center text-muted-foreground flex items-center justify-center w-full h-full bg-[#f1f5f9] ">
                <span className="text-2xl font-bold text-[#aeaeae]">No Video Selected</span>
              </div>
            )}

          </div>
          
          {/* Always show the Timeline, but pass isEnabled flag based on video state */}
          <div className="w-full">
              <Timeline 
                videoRef={videoRef} 
                duration={duration} 
                isEnabled={isVideoLoaded && !!videoPath} 
              />
          </div>
        </div>
      </VideoContext.Provider>
  );
});

VideoContainer.displayName = 'VideoContainer';

export default VideoContainer;