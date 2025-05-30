import React, { useRef, useState, useEffect } from "react";
import Timeline from "./TimeLine";
import { AppContext } from "@/App";
import ChessOverlay from "./ChessOverlay";

interface VideoContainerProps {
  videoPath: string | null;
}

interface OverlayType {
  fen?: string;
  moveIndex?: number;
  timestamp: number;
}

interface VideoContextType {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  checkpoints: number[];
  setCheckpoints: React.Dispatch<React.SetStateAction<number[]>>;
  createCheckpoint: (timestamp: number) => void;
}

export const VideoContext = React.createContext<VideoContextType>({
  isPlaying: false,
  setIsPlaying: () => {},
  currentTime: 0,
  setCurrentTime: () => {},
  checkpoints: [],
  setCheckpoints: () => {},
  createCheckpoint: () => {},
});

const VideoContainer = ({ videoPath }: VideoContainerProps) => {
  const { positions, currentMoveIndex, setTimestamps} = React.useContext(AppContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const [overlays, setOverlays] = useState<OverlayType[]>([{timestamp: -1}]);
  const [currentOverlayId, setCurrentOverlayId] = useState<number>(0);
  const [checkpoints, setCheckpoints] = useState<number[]>([]);

  const createCheckpoint = (timestamp: number) => {
    if (!isVideoLoaded && !!videoPath) return;

    // Round timestamp to 1 decimal place
    const roundedTimestamp = Math.round(timestamp * 10) / 10;

    // Check if a checkpoint already exists at this timestamp (within 0.1 seconds tolerance)
    const existingCheckpoint = checkpoints.find(cp => Math.abs(cp - roundedTimestamp) < 0.1);
    if (existingCheckpoint) return;

    setCheckpoints(prev => [...prev, roundedTimestamp]);
  };

  useEffect(() => {
    // Reset state when video changes
    console.log("Video path changed:", videoPath);
    setIsVideoLoaded(false);
    setDuration(0);
  }, [videoPath]);

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


  return (
    <div className="flex flex-col justify-center items-center w-full">
      <div className="w-full max-w-full aspect-video bg-black rounded-t-lg relative" onDoubleClick={handleOverlaying}>
        {overlays[currentOverlayId].fen ? (
          <ChessOverlay currentFen={overlays[currentOverlayId].fen} evaluation={null} opacity={0.7}/>
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
        <VideoContext.Provider value={{ 
          isPlaying, setIsPlaying,
          currentTime, setCurrentTime,
          checkpoints, setCheckpoints,
          createCheckpoint}}>
          <Timeline 
            videoRef={videoRef} 
            duration={duration} 
            isEnabled={isVideoLoaded && !!videoPath} 
          />
        </VideoContext.Provider>
      </div>
    </div>
  );
};

export default VideoContainer;