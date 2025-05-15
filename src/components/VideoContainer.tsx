// VideoContainer.tsx
interface VideoContainerProps {
    videoPath: string | null;
  }
  
  const VideoContainer = ({ videoPath }: VideoContainerProps) => {
    return (
      <div className="flex justify-center items-center p-4 w-full">
        <div className="w-full max-w-3xl aspect-video">
          {videoPath ? (
            <video
              className="w-full h-full rounded-2xl shadow-lg"
              controls
              src={videoPath}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="text-center text-muted-foreground">
              No video selected.
            </div>
          )}
        </div>
      </div>
    );
  };
  
  export default VideoContainer;
  