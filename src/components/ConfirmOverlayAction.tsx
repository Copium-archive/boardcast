import { useState} from 'react';
import { Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import ChessOverlay from './ChessOverlay';

interface OverwritingProps {
  enable: boolean,
  oldFen?: string,
  newFen?: string
}

interface ChangingTimestampProps {
  enable: boolean,
  oldTimestamp?: number | null,
  newTimestamp?: number | null
}

interface ConfirmOverlayActionProps {
    overwriting: OverwritingProps;
    changingTimestamp: ChangingTimestampProps;
    handleConfirm: (keepOldCheckpoint: boolean) => void;
    onCancel?: () => void;
}

const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const decimals = Math.floor((time % 1) * 10);
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${decimals}`;
};

// function formatTimestamp(timestamp: number | null | undefined): string {
//     if (timestamp == null) return 'N/A';
    
//     const minutes = Math.floor(timestamp / 60);
//     const seconds = timestamp % 60;
//     return `${minutes}:${seconds.toString().padStart(2, '0')}`;
// }

// const roundedTime = Math.round(video.currentTime * 10) / 10;
export default function ConfirmOverlayAction({overwriting, changingTimestamp, handleConfirm, onCancel}: ConfirmOverlayActionProps) {    
    const [open, setOpen] = useState(true);
    const [keepOldCheckpoint, setKeepOldCheckpoint] = useState(false);
    const chessOverlaySize = 180;
    const chessOverlayWidth = chessOverlaySize * (9 / 8);


    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            onCancel?.();
        }
        setOpen(newOpen);
    };

    const handleConfirmClick = () => {
        handleConfirm(keepOldCheckpoint);
        setOpen(false);
    };

    const handleCancelClick = () => {
        onCancel?.();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>Confirm Actions</DialogTitle>
                
                <div className="space-y-6">
                    {/* Overwriting Operation */}
                    {overwriting.enable && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Old Position */}
                                <div className="space-y-2">
                                    <h4 className="font-medium">Current Position</h4>
                                    {overwriting.oldFen ? (
                                        <div className="flex justify-center">
                                            <div 
                                                className="relative"
                                                style={{ width: chessOverlayWidth, height: chessOverlaySize }}
                                            >
                                                <ChessOverlay 
                                                    currentFen={overwriting.oldFen}
                                                    evaluation={null}
                                                    size={chessOverlaySize}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                                            <span className="text-gray-500">No overlay (blank)</span>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 break-all">
                                        {overwriting.oldFen || 'No position'}
                                    </p>
                                </div>

                                {/* New Position */}
                                <div className="space-y-2">
                                    <h4 className="font-medium">New Position</h4>
                                    {overwriting.newFen ? (
                                        <div className="flex justify-center">
                                            <div 
                                                className="relative"
                                                style={{ width: chessOverlayWidth, height: chessOverlaySize }}
                                            >
                                                <ChessOverlay 
                                                    currentFen={overwriting.newFen}
                                                    evaluation={null}
                                                    size={chessOverlaySize}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                                            <span className="text-gray-500">No overlay (blank)</span>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 break-all">
                                        {overwriting.newFen || 'No position'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Timestamp Change Operation */}
                    {changingTimestamp.enable && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">
                                Timestamp Change
                            </h3>
                            <p className="text-sm text-gray-600">
                                You are about to change the timestamp for a chess position overlay:
                            </p>
                            
                            <div className="flex items-center justify-center space-x-4 py-4">
                                <div className="text-center">
                                    <div className="text-lg font-mono bg-red-50 px-3 py-2 rounded border">
                                        {(changingTimestamp.oldTimestamp && formatTime(changingTimestamp.oldTimestamp))}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">Current Time</p>
                                </div>
                                
                                <div className="text-2xl text-gray-400">→</div>
                                
                                <div className="text-center">
                                    <div className="text-lg font-mono bg-green-50 px-3 py-2 rounded border">
                                        {(changingTimestamp.newTimestamp && formatTime(changingTimestamp.newTimestamp))}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">New Time</p>
                                </div>
                            </div>
                            <div className="items-top flex space-x-2">
                                <Checkbox
                                    id="keep-old-checkpoint"
                                    checked={keepOldCheckpoint}
                                    onCheckedChange={(checked) => setKeepOldCheckpoint(!!checked)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                    htmlFor="keep-old-checkpoint"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Keep old checkpoint
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Both operations active */}
                    {overwriting.enable && changingTimestamp.enable && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> Both position override and timestamp change will be applied simultaneously.
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-3 pt-4 border-t">
                    <Button 
                        onClick={handleConfirmClick}
                        className="w-full bg-red-700 hover:bg-red-800 text-white font-medium"
                    >
                        Apply
                    </Button>
                    
                    <Button 
                        onClick={handleCancelClick}
                        variant="outline"
                        className="w-full"
                    >
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}