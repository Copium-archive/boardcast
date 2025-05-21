import React, { useRef, useState, useEffect } from "react";
import Timeline from "./TimeLine";

interface VideoContainerProps {
  videoPath: string | null;
}

interface VideoContextType {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

export const VideoContext = React.createContext<VideoContextType>({
  isPlaying: false,
  setIsPlaying: () => {},
});

const VideoContainer = ({ videoPath }: VideoContainerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Reset state when video changes
    setIsVideoLoaded(false);
    setDuration(0);
  }, [videoPath]);

  const handleVideoMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsVideoLoaded(true);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center w-full">
      <div className="w-full max-w-full aspect-video bg-black rounded-t-lg">
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
        <VideoContext.Provider value={{ isPlaying, setIsPlaying }}>
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