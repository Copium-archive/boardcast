import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";

interface VideoSliderProps {
  currentTime: number;
  duration: number;
  checkpoints: number[];
  autoSkipSegments: { start: number; end: number }[];
  isEnabled: boolean;
  isAutoSkipEnabled: boolean;
  onSeek: (value: number[]) => void;
}

const VideoSlider = ({ 
  currentTime, 
  duration, 
  checkpoints, 
  isEnabled,
  autoSkipSegments, 
  isAutoSkipEnabled, 
  onSeek 
}: VideoSliderProps) => {
    const [autoSkipIndex, setAutoSkipIndex] = useState<number>(0);
        
    useEffect(() => {
        if (!isAutoSkipEnabled) return; // Skip if disabled
        
        let latestIndex = 0;
        for (let i = 0; i < autoSkipSegments.length; i++) {
            if (autoSkipSegments[i].start <= currentTime) {
                latestIndex = i;
            } else {
                break;
            }
        }
        setAutoSkipIndex(latestIndex);
    }, [autoSkipSegments, isAutoSkipEnabled]);

    useEffect(() => {
        if (!isAutoSkipEnabled) return; // Skip if disabled
        
        let latestIndex = autoSkipIndex;
        if(autoSkipSegments[autoSkipIndex].start <= currentTime) {
            for (let i = autoSkipIndex; i < autoSkipSegments.length; i++) {
                if (autoSkipSegments[i].start <= currentTime) {
                    latestIndex = i;
                } else {
                    break;
                }
            }
        }
        else {
            for (let i = autoSkipIndex; i >= 0; i--) {
                if (autoSkipSegments[i].start <= currentTime) {
                    latestIndex = i;
                    break;
                }
            }
        }
        setAutoSkipIndex(latestIndex);
    }, [currentTime, isAutoSkipEnabled]);

    useEffect(() => {
        if (!isAutoSkipEnabled) return; // Skip if disabled
        
        if(autoSkipSegments[autoSkipIndex].start <= currentTime && currentTime <= autoSkipSegments[autoSkipIndex].end) {
            // If the current time is within the segment, skip to the end of the segment
            const newTime = autoSkipSegments[autoSkipIndex].end;
            if (newTime < duration) {
                onSeek([newTime]);
            }
        }
    }, [autoSkipIndex, currentTime, isAutoSkipEnabled]);

    return (
        <div className="w-full relative">
        <Slider
            value={[currentTime]}
            min={0}
            max={duration}
            step={0.01}
            onValueChange={onSeek}
            className={`cursor-pointer ${!isEnabled ? 'pointer-events-none' : ''} no-thumb thick-slider`}
            disabled={!isEnabled}
        />

        {/* Dark grey overlays for detected segments */}
        {isEnabled && autoSkipSegments.map((segment, index) => {
            const startPosition = (segment.start / duration) * 100;
            const endPosition = (segment.end / duration) * 100;
            const width = endPosition - startPosition;
            
            return (
            <div
                key={`segment-${index}`}
                className="absolute z-10 pointer-events-none"
                style={{
                left: `${startPosition}%`,
                top: '0',
                width: `${width}%`,
                height: '100%',
                backgroundColor: 'rgba(156, 163, 175, 0.4)', // lighter grey with more transparency
                }}
                title={`Detected segment: ${segment.start}s - ${segment.end}s`}
            />
            );
        })}

        {isEnabled && checkpoints.map((checkpoint) => {
            const position = (checkpoint / duration) * 100;
            return (
            <div
                key={checkpoint}
                className="absolute z-20"
                style={{
                left: `calc(${position}% - 1px)`,
                top: '0',
                width: '4px',
                height: '110%',
                background: 'linear-gradient(to bottom, #60a5fa 60%, #2563eb 100%)',
                boxShadow: '0 0 2px 1px #2563eb88',
                transition: 'background 0.2s, box-shadow 0.2s',
                }}
            >
                <div
                style={{
                    position: 'absolute',
                    top: '-7px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '10px',
                    height: '10px',
                    background: '#60a5fa',
                    borderRadius: '50%',
                    boxShadow: '0 0 2px 1px #2563eb88',
                    border: '1px solid #fff',
                    zIndex: 30,
                }}
                />
            </div>
            );
        })}
        </div>
    );
};

export default VideoSlider;