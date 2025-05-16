import { useRef, useState, useEffect } from "react";
import Timeline from "./TimeLine";

interface VideoContainerProps {
  videoPath: string | null;
}

const VideoContainer = ({ videoPath }: VideoContainerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

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
          <div className="text-center text-muted-foreground flex items-center justify-center w-full h-full bg-neutral-500 ">
            <span className="text-2xl font-bold text-zinc-200">No Video Selected</span>
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
  );
};

export default VideoContainer;