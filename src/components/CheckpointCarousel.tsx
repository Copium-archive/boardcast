import { useEffect, useRef } from "react";
import { Bookmark, X} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface CheckpointCarouselProps {
    checkpoints: number[];
    selectCheckpoint: (timestamp: number, index: number) => void;
    removeCheckpoint: (timestamp: number) => void;
    checkpointIndex: number | null;
    isEnabled?: boolean;
}

const CheckpointCarousel = ({
    checkpoints,
    selectCheckpoint,
    removeCheckpoint,
    checkpointIndex,
    isEnabled = true
}: CheckpointCarouselProps) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const selectedCheckpointRef = useRef<HTMLDivElement>(null);

    // Format time to HH:MM:SS.S format (with 1 decimal place)
    const formatTime = (time: number): string => {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        const decimals = Math.floor((time % 1) * 10);
        return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${decimals}`;
    };

    // Scroll to selected checkpoint when checkpointIndex changes
    useEffect(() => {
        const checkpointElement = selectedCheckpointRef.current;
        if (checkpointElement) {
            checkpointElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center',
            });
        }
    }, [checkpointIndex]);

    if (!isEnabled || checkpoints.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center border-t border-border/50">
            <ScrollArea 
                ref={scrollAreaRef}
                className="flex flex-grow w-0"
            >
                <div className="flex items-center gap-2 p-3 min-w-max">
                {checkpoints.map((timestamp, index) => (
                    <div
                    key={`${timestamp}-${index}`}
                    ref={index === checkpointIndex ? selectedCheckpointRef : null}
                    className={`relative group transition-all duration-200 ${
                        index === checkpointIndex ? 'scale-105' : 'hover:scale-102'
                    }`}
                    >
                    <Badge
                        variant="secondary"
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-200 ${
                            index === checkpointIndex 
                                ? 'shadow-md ring-2 ring-primary/20 bg-primary/10'
                                : 'hover:bg-secondary/80'
                        }`}
                        onClick={() => {
                            selectCheckpoint(timestamp, index);
                        }}
                    >
                        <Bookmark size={12} />
                        <span className="font-mono text-xs whitespace-nowrap">
                            {formatTime(timestamp)}
                        </span>
                    </Badge>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeCheckpoint(timestamp);
                        }}
                        className={`absolute -top-1 -right-1 w-5 h-5 p-0 rounded-full bg-background border border-border shadow-sm transition-opacity duration-200 ${
                            index === checkpointIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        } hover:bg-muted hover:text-foreground hover:border-muted-foreground`}
                    >
                        <X size={10} />
                    </Button>
                    </div>
                ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Counter */}
            <div className="px-3 py-2 text-xs text-muted-foreground border-l border-border/30 bg-muted/30">
                {checkpoints.length}
            </div>
        </div>
    );
};

export default CheckpointCarousel;