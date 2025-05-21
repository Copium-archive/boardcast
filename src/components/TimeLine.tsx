import { useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Minus, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContext } from "react";
import { VideoContext } from "./VideoContainer";

interface TimelineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  isEnabled?: boolean; // New prop to control disabled state
  initialSkipTime?: number; // Initial time skip duration in seconds
}

const Timeline = ({ videoRef, duration, isEnabled = true, initialSkipTime = 5 }: TimelineProps) => {
  const { isPlaying, setIsPlaying } = useContext(VideoContext);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [skipTime, setSkipTime] = useState(initialSkipTime);

  // Toggle mute - FIXED
  const toggleMute = () => {
    if (!videoRef.current || !isEnabled) return;
    
    const newMutedState = !videoRef.current.muted;
    videoRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  };

  // Format time to MM:SS:MS format (with milliseconds)
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${milliseconds.toString().padStart(3, '0')}`;
  };

  // Initialize state from video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isEnabled) return;
    
    // Set initial values from video element
    setIsPlaying(!video.paused);
    setCurrentTime(video.currentTime);
    setPlaybackRate(video.playbackRate);
    setVolume(video.volume);
    setIsMuted(video.muted);
  }, [videoRef, isEnabled]);

  // Update time display when video is playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isEnabled) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };

    // Use requestAnimationFrame for smoother millisecond updates
    let animationFrameId: number;
    
    const updateTimeWithAnimation = () => {
      updateTime();
      animationFrameId = requestAnimationFrame(updateTimeWithAnimation);
    };
    
    video.addEventListener('play', () => {
      updateTimeWithAnimation();
    });
    
    video.addEventListener('pause', () => {
      cancelAnimationFrame(animationFrameId);
    });
    
    video.addEventListener('timeupdate', updateTime);
    
    if (!video.paused) {
      updateTimeWithAnimation();
    }
    
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('play', updateTimeWithAnimation);
      video.removeEventListener('pause', () => {
        cancelAnimationFrame(animationFrameId);
      });
      cancelAnimationFrame(animationFrameId);
    };
  }, [videoRef, isEnabled]);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isEnabled) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [videoRef, isEnabled]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isEnabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      
      switch(e.key) {
        case ' ':  // Space bar
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
        case '<':
          skipBackward();
          break;
        case 'ArrowRight':
        case '>':
          skipForward();
          break;
        case '+':
          changePlaybackRate(0.25);
          break;
        case '-':
          changePlaybackRate(-0.25);
          break;
        case ',':
          changeSkipTime(-0.5);
          break;
        case '.':
          changeSkipTime(0.5);
          break;
        case 'm':
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [videoRef, isEnabled]);

  // Toggle play/pause - FIXED
  const togglePlayPause = () => {
    if (!videoRef.current || !isEnabled) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error("Error playing video:", err);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Skip backward by skipTime seconds
  const skipBackward = () => {
    if (!videoRef.current || !isEnabled) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - skipTime);
  };

  // Skip forward by skipTime seconds
  const skipForward = () => {
    if (!videoRef.current || !isEnabled) return;
    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + skipTime);
  };

  // Seek to position (with higher precision)
  const seek = (value: number[]) => {
    if (!videoRef.current || !isEnabled) return;
    const position = value[0] / 100;
    videoRef.current.currentTime = position * duration;
  };

  // Change playback speed
  const changePlaybackRate = (change: number) => {
    if (!videoRef.current || !isEnabled) return;
    
    const newRate = Math.max(0.25, Math.min(2, playbackRate + change));
    setPlaybackRate(newRate);
    videoRef.current.playbackRate = newRate;
  };

  // Change volume
  const changeVolume = (value: number[]) => {
    if (!videoRef.current || !isEnabled) return;
    const newVolume = value[0] / 100;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume > 0 && videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  // Change skip time
  const changeSkipTime = (change: number) => {
    if (!isEnabled) return;
    // Minimum 0.5 second, maximum 60 seconds
    const newSkipTime = Math.max(0.5, Math.min(60, skipTime + change));
    setSkipTime(newSkipTime);
  };

  return (
    <TooltipProvider>
      <Card className={`w-full bg-background border-border ${!isEnabled ? 'opacity-70' : ''} rounded-tr-none rounded-tl-none p-0`}>
        <CardContent className="p-4 space-y-2">
          {/* Timestamp display - Moved to top */}
          <div className="flex justify-between items-center px-1">
            <div className="text-xs text-muted-foreground">Current</div>
            <div className="text-sm font-medium font-mono">
              {formatTime(isEnabled ? currentTime : 0)} / {formatTime(isEnabled ? duration : 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          
          {/* Progress slider */}
          <div className="w-full">
            <Slider
              value={[currentTime / duration * 100]}
              min={0}
              max={100}
              step={0.01} // Increased precision for finer control
              onValueChange={seek}
              className={`cursor-pointer ${!isEnabled ? 'pointer-events-none' : ''}`}
              disabled={!isEnabled}
            />
          </div>
          
          {/* Controls row */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    disabled={!isEnabled}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPlaying ? "Pause (Space)" : "Play (Space)"}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={skipBackward}
                    aria-label="Skip backward"
                    disabled={!isEnabled}
                  >
                    <SkipBack size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Skip back {skipTime}s (←)</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={skipForward}
                    aria-label="Skip forward"
                    disabled={!isEnabled}
                  >
                    <SkipForward size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Skip forward {skipTime}s (→)</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    disabled={!isEnabled}
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle mute (M)</p>
                </TooltipContent>
              </Tooltip>
              
              <div className="w-24 ml-2">
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={changeVolume}
                  aria-label="Volume"
                  disabled={!isEnabled}
                  className={!isEnabled ? 'pointer-events-none' : ''}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => changeSkipTime(-0.5)}
                    aria-label="Decrease skip time"
                    disabled={!isEnabled}
                  >
                    <Minus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Decrease skip time</p>
                </TooltipContent>
              </Tooltip>
              
              <Badge variant="outline">
                {skipTime}s
              </Badge>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => changeSkipTime(0.5)}
                    aria-label="Increase skip time"
                    disabled={!isEnabled}
                  >
                    <Plus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Increase skip time</p>
                </TooltipContent>
              </Tooltip>

              <div className="border-l h-6 mx-2 border-gray-300"></div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => changePlaybackRate(-0.25)}
                    aria-label="Decrease playback speed"
                    disabled={!isEnabled}
                  >
                    <Minus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Decrease speed (-)</p>
                </TooltipContent>
              </Tooltip>
              
              <Badge variant="secondary">
                {playbackRate}x
              </Badge>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => changePlaybackRate(0.25)}
                    aria-label="Increase playback speed"
                    disabled={!isEnabled}
                  >
                    <Plus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Increase speed (+)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default Timeline;