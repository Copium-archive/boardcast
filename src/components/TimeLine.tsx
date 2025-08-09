import { useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Settings } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { useContext } from "react";
import { VideoContext } from "./VideoContainer";
import { AppContext } from "@/App";
import SettingsDialog from "./SettingsDialog";
import CheckpointCarousel from "./CheckpointCarousel";
import VideoSlider from "./VideoSlider";
// import { invoke } from "@tauri-apps/api/core";

interface TimelineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  isEnabled?: boolean;
  initialSkipTime?: number;
}

const Timeline = ({duration, isEnabled = true, initialSkipTime }: TimelineProps) => {
  const { 
    videoRef,
    currentTime, setCurrentTime, 
    isPlaying, setIsPlaying,
    checkpoints, setCheckpoints,
    createCheckpoint,
    ROI
  } = useContext(VideoContext);
  const {
    isEditingContour
  } = useContext(AppContext);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [checkpointIndex, setCheckpointIndex] = useState<number>(-1);
  const leftCheckpointId = checkpointIndex;
  const rightCheckpointId = checkpointIndex + 1;
  
  const [isAutoSkipEnabled, setIsAutoSkipEnabled] = useState(false);
  const [autoSkipSegments, setAutoSkipSegments] = useState<{ start: number; end: number }[]>([{ start: -1, end: -1 }]);

  // Pause video when entering edit mode
  useEffect(() => {
    if (isEditingContour && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isEditingContour, videoRef]);

  useEffect(() => {
    const runScript = async () => {
      if (ROI.length === 0) {
        return;
      }
      try {
        // console.log("region of interest", ROI)
        // const result = await invoke<string>("run_python_script", {
        //   script: "motion.py",
        //   cliArgs: ROI,
        //   osEnv: "Windows"
        // });
        // // Parse the result as JSON and set autoSkipSegments
        // // The result is expected to be a JSON string like: {"segments": [[0, 10], [15.0, 18], [23, 26]]}
        // const parsed = JSON.parse(result);
        // if (Array.isArray(parsed.segments)) {
        //   setAutoSkipSegments(
        //     parsed.segments.map(([start, end]: [number, number]) => ({ start, end }))
        //   );
        // } else {
        //   setAutoSkipSegments([]);
        // }
        // console.log("Auto-skip script output:", parsed);

        // Dummy result for development/testing
        const dummyParsed = {
          segments: [
            [0, 10],
            [15, 18],
            [23, 26]
          ]
        };
        setAutoSkipSegments(
          dummyParsed.segments.map((segment: number[]) => {
            const [start, end] = segment;
            return { start, end };
          })
        );
        console.log("Auto-skip script output (dummy):", dummyParsed);
      } catch (error) {
        console.error("Error running auto-skip script:", error);
        setAutoSkipSegments([]);
      }
    };

    runScript();
  }, [ROI]);

  useEffect(() => {
    // Find the most recent checkpoint with timestamp <= currentTime
    let latestIndex = -1;
    for (let i = 0; i < checkpoints.length; i++) {
      if (checkpoints[i] <= currentTime) {
        latestIndex = i;
      } else {
        break;
      }
    }
    setCheckpointIndex(latestIndex);
  }, [checkpoints]);

  useEffect(() => {
    if (!videoRef.current || !isEnabled || checkpoints.length === 0) return;
    if(currentTime < checkpoints[0]) {
      setCheckpointIndex(-1);
      return;
    }

    const curr = Math.max(0, checkpointIndex);
    let latestIndex = curr;
    if(checkpoints[curr] <= currentTime) {
      for (let i = curr; i < checkpoints.length; i++) {
        if (checkpoints[i] <= currentTime) {
          latestIndex = i;
        } else {
          break;
        }
      }
    }
    else {
      for (let i = curr; i >= 0; i--) {
        if (checkpoints[i] <= currentTime) {
          latestIndex = i;
          break;
        }
      }
    }
    setCheckpointIndex(latestIndex);
  }, [currentTime]);
  

  // Calculate automatic skip time based on video duration (1% of total duration)
  const calculateAutoSkipTime = () => {
    const autoSkip = duration * 0.01; // 1% of duration
    return Math.max(1, Math.min(60, Math.round(autoSkip * 10) / 10)); // Constrain to [1-60]s and round to 1 decimal
  };
  
  const [skipTime, setSkipTime] = useState(() => {
    if (initialSkipTime !== undefined) {
      return initialSkipTime;
    }
    return duration > 0 ? calculateAutoSkipTime() : 5;
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Update skip time when duration changes
  useEffect(() => {
    if (duration > 0 && initialSkipTime === undefined) {
      setSkipTime(calculateAutoSkipTime());
    }
  }, [duration, initialSkipTime]);

  // Navigate to the closest checkpoint to the left
  const navigateToLeftCheckpoint = () => {
    if (!videoRef.current || !isEnabled || checkpoints.length === 0) return;
    if(leftCheckpointId < 0) return;

    videoRef.current.pause();
    setIsPlaying(false);
    
    const currentTimestamp = videoRef.current.currentTime;
    let newTimestamp = checkpoints[leftCheckpointId];

    // Compare up to the 1st decimal place
    const isSameTimestamp =
        Math.round(newTimestamp * 10) / 10 === Math.round(currentTimestamp * 10) / 10;

    if (isSameTimestamp && leftCheckpointId > 0) {
      newTimestamp = checkpoints[leftCheckpointId - 1];
    }

    videoRef.current.currentTime = newTimestamp;
  };

  // Navigate to the closest checkpoint to the right
  // refactor
  const navigateToRightCheckpoint = () => {
    if (!videoRef.current || !isEnabled || checkpoints.length === 0) return;
    if (rightCheckpointId >= checkpoints.length) return;

    videoRef.current.pause();
    setIsPlaying(false);

    const currentTimestamp = videoRef.current.currentTime;
    let newTimestamp = checkpoints[rightCheckpointId];

    // Compare up to the 1st decimal place
    const isSameTimestamp =
        Math.round(newTimestamp * 10) / 10 === Math.round(currentTimestamp * 10) / 10;

    if (isSameTimestamp && rightCheckpointId < checkpoints.length - 1) {
      newTimestamp = checkpoints[rightCheckpointId + 1];
    }

    videoRef.current.currentTime = newTimestamp;
  };

  // Navigate to specific checkpoint from carousel
  const selectCheckpoint = (timestamp: number, index: number) => {
    if (!videoRef.current || !isEnabled) return;
    
    videoRef.current.currentTime = timestamp;
    videoRef.current.pause();
    setIsPlaying(false);
    setCheckpointIndex(index);
  };

  // Remove specific checkpoint
  const removeCheckpoint = (timestamp: number) => {
    if (!isEnabled) return;
    
    const updatedCheckpoints = checkpoints.filter(cp => cp !== timestamp);
    setCheckpoints(updatedCheckpoints);
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current || !isEnabled) return;
    
    const newMutedState = !videoRef.current.muted;
    videoRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  };

  // Format time to HH:MM:SS.S format (with 1 decimal place)
  const formatTime = (time: number): string => {
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = Math.floor(time % 60);
      const decimals = Math.round((time % 1) * 10);
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${decimals}`;
  };

  // Initialize state from video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isEnabled) return;
    
    // Set initial values from video element
    setIsPlaying(!video.paused);
    const roundedTime = Math.round(video.currentTime * 10) / 10;
    setCurrentTime(roundedTime);
    setPlaybackRate(video.playbackRate);
    setVolume(video.volume);
    setIsMuted(video.muted);
  }, [videoRef, isEnabled]);

  // Update time display when video is playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isEnabled) return;

    const updateTime = () => {
      const roundedTime = Math.round(video.currentTime * 10) / 10;
      setCurrentTime(roundedTime);
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
          {
            e.preventDefault();
            // Prevent play/pause when in edit mode
            if (!isEditingContour) {
              togglePlayPause();
            }
            // Create checkpoint when pausing (not when playing)
          }
          break;
        case 'x':
        case 'X': {
            const wasPlaying = !videoRef.current.paused;
            if (wasPlaying === false) {
              createCheckpoint(videoRef.current.currentTime);
            }
            break;
        }
        case 'ArrowLeft':
          skipBackward();
          break;
        case 'ArrowRight':
          skipForward();
          break;
        case '+':
          changePlaybackRate(0.25);
          break;
        case '-':
          changePlaybackRate(-0.25);
          break;
        case ',':
          changeSkipTime(-0.1);
          break;
        case '.':
          changeSkipTime(0.1);
          break;
        case 'm':
          toggleMute();
          break;
        case 'a':
        case 'A':
          navigateToLeftCheckpoint();
          break;
        case 'd':
        case 'D':
          navigateToRightCheckpoint();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [videoRef, isEnabled, checkpoints, checkpointIndex, skipTime, isEditingContour]);

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current || !isEnabled || isEditingContour) return;
    
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
    console.log("Skipping backward", skipTime);
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - skipTime);
  };

  // Skip forward by skipTime seconds
  const skipForward = () => {
    if (!videoRef.current || !isEnabled) return;
    console.log("Skipping forward", skipTime);
    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + skipTime);
  };

  // Seek to position
  const seek = (value: number[]) => {
    if (!videoRef.current || !isEnabled) return;
    videoRef.current.currentTime = value[0];
  };

  // Change playback speed
  const changePlaybackRate = (change: number) => {
    if (!videoRef.current || !isEnabled) return;
    
    const newRate = Math.max(0.25, Math.min(2, playbackRate + change));
    setPlaybackRate(newRate);
    videoRef.current.playbackRate = newRate;
  };

  // Set playback speed directly
  const setPlaybackRateDirectly = (rate: number) => {
    if (!videoRef.current || !isEnabled) return;
    
    setPlaybackRate(rate);
    videoRef.current.playbackRate = rate;
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

  // Change skip time with 0.1s precision
  const changeSkipTime = (change: number) => {
    if (!isEnabled) return;
    // Round to 1 decimal place and constrain to [1-60]s
    const newSkipTime = Math.max(1, Math.min(60, Math.round((skipTime + change) * 10) / 10));
    setSkipTime(newSkipTime);
  };

  // Set skip time directly with validation
  const setSkipTimeDirectly = (time: number) => {
    if (!isEnabled) return;
    // Round to 1 decimal place and constrain to [1-60]s
    const validatedTime = Math.max(1, Math.min(60, Math.round(time * 10) / 10));
    setSkipTime(validatedTime);
  };

  // Clear all checkpoints
  const clearCheckpoints = () => {
    if (!isEnabled) return;
    setCheckpoints([]);
  };

  return (
    <TooltipProvider>
      <Card className={`w-full bg-background border-border ${!isEnabled ? 'opacity-70' : ''} rounded-tr-none rounded-tl-none p-0`}>
        <CardContent className="p-4 space-y-3">
          {/* Timestamp display with auto-skip toggle */}
          <div className="flex justify-between items-center px-1 pb-2">
            {/* Empty space for balance */}
            <div></div>

            {/* Timestamp display - Centered */}
            <div className="text-sm font-medium font-mono">
              {formatTime(isEnabled ? currentTime : 0)} / {formatTime(isEnabled ? duration : 0)}
            </div>

            {/* Auto-skip toggle - Right side */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAutoSkipEnabled(!isAutoSkipEnabled)}>
                    <span className="text-xs text-muted-foreground">Auto-skip</span>
                    <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${isAutoSkipEnabled ? 'bg-black' : 'bg-gray-300'} ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mt-0.5 ${isAutoSkipEnabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Auto-skip silence</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Video Slider with checkpoint markers and detected segments */}
          <VideoSlider 
            currentTime={currentTime}
            duration={duration}
            checkpoints={checkpoints}
            autoSkipSegments={autoSkipSegments}
            isEnabled={isEnabled}
            isAutoSkipEnabled={isAutoSkipEnabled}
            onSeek={seek}
          />

          {/* Checkpoint Carousel */}
          <CheckpointCarousel
            checkpoints={checkpoints}
            selectCheckpoint={selectCheckpoint}
            removeCheckpoint={removeCheckpoint}
            checkpointIndex={checkpointIndex}
            isEnabled={isEnabled}
          />
          
          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    disabled={!isEnabled || isEditingContour}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isEditingContour ? "Play disabled in edit mode" : (isPlaying ? "Pause (Space)" : "Play (Space)")}</p>
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
              {/* Checkpoint controls */}
              {checkpoints.length > 0 && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearCheckpoints}
                        disabled={!isEnabled}
                        className="text-xs px-2"
                      >
                        Clear All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear all checkpoints</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <div className="border-l h-6 mx-2 border-gray-300"></div>
                </>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    disabled={!isEnabled}
                    className="relative"
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  >
                    <Settings size={16}/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
                            
              <SettingsDialog
                isOpen={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                skipTime={skipTime}
                playbackRate={playbackRate}
                onSkipTimeChange={changeSkipTime}
                onPlaybackRateChange={changePlaybackRate}
                onSkipTimeSet={setSkipTimeDirectly}
                onPlaybackRateSet={setPlaybackRateDirectly}
                isEnabled={isEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default Timeline;