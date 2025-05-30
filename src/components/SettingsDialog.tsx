import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  skipTime: number;
  playbackRate: number;
  onSkipTimeChange: (change: number) => void;
  onPlaybackRateChange: (change: number) => void;
  onSkipTimeSet: (value: number) => void;
  onPlaybackRateSet: (value: number) => void;
  isEnabled: boolean;
}

const SettingsDialog = ({
  isOpen,
  onOpenChange,
  skipTime,
  playbackRate,
  onSkipTimeChange,
  onPlaybackRateChange,
  onSkipTimeSet,
  onPlaybackRateSet,
  isEnabled
}: SettingsDialogProps) => {
  const [editingSkipTime, setEditingSkipTime] = useState(false);
  const [editingPlaybackRate, setEditingPlaybackRate] = useState(false);
  const [tempSkipTime, setTempSkipTime] = useState(skipTime.toString());
  const [tempPlaybackRate, setTempPlaybackRate] = useState(playbackRate.toString());

  // Format skip time with 1 decimal place
  const formatSkipTime = (time: number): string => {
    return `${time.toFixed(1)}s`;
  };

  // Handle skip time input change
  const handleSkipTimeInputChange = (value: string) => {
    setTempSkipTime(value);
  };

  // Handle skip time input blur/enter
  const handleSkipTimeInputSubmit = () => {
    const numValue = parseFloat(tempSkipTime);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 60) {
      // Round to 1 decimal place
      const roundedValue = Math.round(numValue * 10) / 10;
      onSkipTimeSet(roundedValue);
    } else {
      setTempSkipTime(skipTime.toFixed(1));
    }
    setEditingSkipTime(false);
  };

  // Handle playback rate input change
  const handlePlaybackRateInputChange = (value: string) => {
    setTempPlaybackRate(value);
  };

  // Handle playback rate input blur/enter
  const handlePlaybackRateInputSubmit = () => {
    const numValue = parseFloat(tempPlaybackRate);
    if (!isNaN(numValue) && numValue >= 0.25 && numValue <= 2) {
      onPlaybackRateSet(numValue);
    } else {
      setTempPlaybackRate(playbackRate.toString());
    }
    setEditingPlaybackRate(false);
  };

  // Update temp values when actual values change
  useEffect(() => {
    if (!editingSkipTime) {
      setTempSkipTime(skipTime.toFixed(1));
    }
  }, [skipTime, editingSkipTime]);

  useEffect(() => {
    if (!editingPlaybackRate) {
      setTempPlaybackRate(playbackRate.toString());
    }
  }, [playbackRate, editingPlaybackRate]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-4 w-auto bg-muted border border-border rounded-md shadow-lg">
        <div className="space-y-4">
          {/* Skip Time Setting */}
          <div className="space-y-2">
            <Label htmlFor="skiptime" className="block text-sm font-medium">
              Skip Time
            </Label>
            <div className="text-xs text-muted-foreground">Range: 1.0s – 60.0s (0.1s increments)</div>
            <div className="flex items-center gap-4">
              <Button
                variant="default"
                size="icon"
                onClick={() => onSkipTimeChange(-0.1)}
                disabled={!isEnabled || skipTime <= 1}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Minus size={16} />
              </Button>

              {editingSkipTime ? (
                <Input
                  id="skiptime"
                  type="number"
                  min="1"
                  max="60"
                  step="0.1"
                  value={tempSkipTime}
                  onChange={(e) => handleSkipTimeInputChange(e.target.value)}
                  onBlur={handleSkipTimeInputSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSkipTimeInputSubmit();
                    } else if (e.key === 'Escape') {
                      setTempSkipTime(skipTime.toFixed(1));
                      setEditingSkipTime(false);
                    }
                  }}
                  className="w-48 text-center border border-border bg-white text-foreground shadow-sm"
                  autoFocus
                />
              ) : (
                <div
                  className="w-48 h-9 flex items-center justify-center border border-border bg-white text-foreground rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground shadow-sm"
                  onDoubleClick={() => setEditingSkipTime(true)}
                >
                  {formatSkipTime(skipTime)}
                </div>
              )}

              <Button
                variant="default"
                size="icon"
                onClick={() => onSkipTimeChange(0.1)}
                disabled={!isEnabled || skipTime >= 60}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>

          {/* Playback Speed Setting */}
          <div className="space-y-2">
            <Label htmlFor="playbackrate" className="block text-sm font-medium">
              Playback Speed
            </Label>
            <div className="text-xs text-muted-foreground">Range: 0.25x – 2x</div>
            <div className="flex items-center gap-4">
              <Button
                variant="default"
                size="icon"
                onClick={() => onPlaybackRateChange(-0.25)}
                disabled={!isEnabled || playbackRate <= 0.25}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Minus size={16} />
              </Button>

              {editingPlaybackRate ? (
                <Input
                  id="playbackrate"
                  type="number"
                  min="0.25"
                  max="2"
                  step="0.25"
                  value={tempPlaybackRate}
                  onChange={(e) => handlePlaybackRateInputChange(e.target.value)}
                  onBlur={handlePlaybackRateInputSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePlaybackRateInputSubmit();
                    } else if (e.key === 'Escape') {
                      setTempPlaybackRate(playbackRate.toString());
                      setEditingPlaybackRate(false);
                    }
                  }}
                  className="w-48 text-center border border-border bg-white text-foreground shadow-sm"
                  autoFocus
                />
              ) : (
                <div
                  className="w-48 h-9 flex items-center justify-center border border-border bg-white text-foreground rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground shadow-sm"
                  onDoubleClick={() => setEditingPlaybackRate(true)}
                >
                  {playbackRate}x
                </div>
              )}

              <Button
                variant="default"
                size="icon"
                onClick={() => onPlaybackRateChange(0.25)}
                disabled={!isEnabled || playbackRate >= 2}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;