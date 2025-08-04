import React, { useContext, useEffect, useState, useRef, useMemo } from 'react';
import { AppContext } from '@/App';
import { Chess } from 'chess.js';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Plus, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const History: React.FC = () => {
  const {
    timestamps, setTimestamps, 
    currentMoveIndex, setCurrentMoveIndex, 
    moves, setMoves, positions, 
    setPositions, 
    interactiveChessboardRef,
    videoContainerRef
  } = useContext(AppContext);
  
  const currentTimestamp = useMemo(() => {
    const ts = timestamps[currentMoveIndex];
    if (ts == null) return "";
    const sec = Math.floor(ts % 60);
    const min = Math.floor((ts / 60) % 60);
    const hr = Math.floor(ts / 3600);
    const decimal = Math.floor((ts - Math.floor(ts)) * 10);
    return [
      hr.toString().padStart(2, "0"),
      min.toString().padStart(2, "0"),
      `${sec.toString().padStart(2, "0")}.${decimal}`
    ].join(":");
  }, [timestamps, currentMoveIndex]);
  const [importText, setImportText] = useState<string>("");
  
  const pgn = useMemo(() => {
    if (moves.length === 0) return "";
    return moves.join(" ");
  }, [moves]);

  // Update importText when dialog opens if there's existing PGN
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  useEffect(() => {
    if (isDialogOpen) {
      setImportText(pgn);
    }
  }, [isDialogOpen, pgn]);
  
  const isLast = () => {
    return currentMoveIndex === moves.length;
  }
  // Add keyboard event listener for Backspace to remove last move
  useEffect(() => {
    const handleBackspace = (e: KeyboardEvent) => {
      // Only trigger if not focused on input/textarea
      const target = e.target as HTMLElement;
      const isInputActive =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA';

      if (!isInputActive && e.key === 'Backspace') {
        if (!isLast()) {
          setCurrentMoveIndex(moves.length);
          return;
        }
        if (isLast() && moves.length > 0) {
          setMoves(moves.slice(0, -1));
          setPositions(positions.slice(0, -1));
          setTimestamps(timestamps.slice(0, -1));
          setCurrentMoveIndex((prevIndex) => {
            return Math.max(0, prevIndex - 1);
          });
        }
      }
    };
    window.addEventListener('keydown', handleBackspace);
    return () => window.removeEventListener('keydown', handleBackspace);
  }, [moves, positions, currentMoveIndex]);

  
  
  // Add a ref for the scroll area
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // Add refs for each move element
  const moveRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize the moveRefs array when moves change
  useEffect(() => {
    // Create an array with length equal to positions.length (including initial position)
    moveRefs.current = Array(positions.length).fill(null);
  }, [positions.length]);

  // Add keyboard event listener for 'w'/'s' keys and Ctrl+W/Ctrl+S combinations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputActive = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA'
      if (!isInputActive) {
        if (e.key === 'w' && !e.altKey) {
          if (currentMoveIndex < positions.length - 1) {
            setCurrentMoveIndex((currentMoveIndex) => {return currentMoveIndex + 1;});
          }
        } else if (e.key === 's' && !e.altKey) {
          if (currentMoveIndex > 0) {
            setCurrentMoveIndex((currentMoveIndex) => {return currentMoveIndex - 1;});
          }
        } 
        // first move
        else if (e.key === 's' && e.altKey) {
          e.preventDefault(); // Prevent browser from closing tab
          navigateToFirst();
        } 
        //last move
        else if (e.key === 'w' && e.altKey) {
          e.preventDefault(); // Prevent browser save dialog
          navigateToLast();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentMoveIndex, positions, setCurrentMoveIndex]);

  // Scroll to current move when currentMoveIndex changes
  useEffect(() => {
    const currentMoveElement = moveRefs.current[currentMoveIndex];
    if (currentMoveElement) {
      currentMoveElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentMoveIndex]);

  const handleMoveClick = (moveIdx: number) => {
    setCurrentMoveIndex(moveIdx);
  };

  const navigateToFirst = () => {
    setCurrentMoveIndex(0);
  };

  const navigateToPrevious = () => {
    if (currentMoveIndex > 0) {
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  };

  const navigateToNext = () => {
    if (currentMoveIndex < positions.length - 1) {
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };

  const navigateToLast = () => {
    setCurrentMoveIndex(positions.length - 1);
  };

  const handleImportPgn = (pgnText: string, shouldCloseDialog = true) => {
    // Process the PGN
    const chess = new Chess();
    const tempPositions: string[] = [chess.fen()];
    const tempMoves: string[] = [];
    
    try {
      chess.loadPgn(pgnText);
    } catch (error) {
      console.error('Invalid PGN', error);
      setMoves(tempMoves);
      setPositions(tempPositions);
      return;
    }
    
    const history = chess.history();
    chess.reset();
    
    for (const move of history) {
      tempMoves.push(move);
      chess.move(move);
      tempPositions.push(chess.fen());
    }
    
    setMoves(tempMoves);
    setPositions(tempPositions);
    setTimestamps(Array(tempPositions.length).fill(null));    
    setCurrentMoveIndex(0);
    
    // Reset dialog state if needed
    if (shouldCloseDialog) {
      setImportText("");
      setIsDialogOpen(false);
    }
  }; 

  const handleRotate = () => {
    // console.log('Rotate button clicked');
    interactiveChessboardRef.current?.skipToOrientation()
  };

  // Function to render moves in the chess.com/lichess style
  const renderMoves = () => {
    // If there are no moves, just show the initial position
    if (moves.length === 0) {
      return (
        <div
          ref={el => { moveRefs.current[0] = el; }}
          onClick={() => handleMoveClick(0)}
          className={`px-4 py-2 text-sm border-b hover:bg-slate-100 cursor-pointer ${
            currentMoveIndex === 0 ? 'bg-blue-100 font-medium' : ''
          }`}
        >
          Initial Position
        </div>
      );
    }

    const moveElements = [];
    
    // Add initial position
    moveElements.push(
      <div
        key="initial"
        ref={el => { moveRefs.current[0] = el; }}
        onClick={() => handleMoveClick(0)}
        className={`px-4 py-2 text-sm border-b hover:bg-slate-100 cursor-pointer ${
          currentMoveIndex === 0 ? 'bg-blue-100 font-medium' : ''
        }`}
      >
        Initial Position
      </div>
    );
    // Group moves in pairs (white/black)
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = i + 1 < moves.length ? moves[i + 1] : null;
      
      moveElements.push(
        <div 
          key={`move-${moveNumber}`}
          className="flex border-b"
        >
          {/* Move number - responsive width for triple/quadruple digits */}
          <div className="min-w-10 px-2 py-2 text-sm text-gray-500 border-r flex-shrink-0 text-right">
            {moveNumber}.
          </div>
          
          {/* White's move - always takes exactly half the remaining space */}
          <div
            ref={el => { moveRefs.current[i + 1] = el; }}
            onClick={() => handleMoveClick(i + 1)}
            className={`w-1/2 px-2 py-2 text-sm hover:bg-slate-100 cursor-pointer ${
              currentMoveIndex === i + 1 ? 'bg-blue-100 font-medium' : ''
            }`}
          >
            {whiteMove}
          </div>
          
          {/* Black's move (if exists) - takes the other half */}
          {blackMove ? (
            <div
              ref={el => { moveRefs.current[i + 2] = el; }}
              onClick={() => handleMoveClick(i + 2)}
              className={`w-1/2 px-2 py-2 text-sm hover:bg-slate-100 cursor-pointer ${
                currentMoveIndex === i + 2 ? 'bg-blue-100 font-medium' : ''
              }`}
            >
              {blackMove}
            </div>
          ) : (
            // Empty placeholder to maintain layout when there's no black move
            <div className="w-1/2"></div>
          )}
        </div>
      );
    }

    moveElements.reverse();
    return moveElements;
  };

  const handleMoveTimestamp = (amount: number) => {
    if(timestamps[currentMoveIndex] === null) return;
    const shiftedTime = timestamps[currentMoveIndex] + amount;
    const newTimestamp = Math.round(shiftedTime * 10) / 10;
    setTimestamps((prevTimestamps) => {
      const newTimestamps = [...prevTimestamps];
      newTimestamps[currentMoveIndex] = newTimestamp;
      return newTimestamps;
    })
    videoContainerRef.current?.moveOverlay(timestamps[currentMoveIndex], amount)
  }

  return (
    <Card className="flex flex-col h-full border-0 rounded-none p-0">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Top controls - Timestamp and Import PGN */}
        <div className="flex items-center justify-between bg-slate-100 py-2 px-2 border-b">
          <div className="flex items-center">
            <Button 
              size="icon" 
              className="h-8 w-5 rounded-none"
              onClick={() => {
                handleMoveTimestamp(-0.1);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input 
              type="text" 
              value={currentTimestamp}
              className="h-8 w-24 text-xs bg-white rounded-none"
              placeholder="00:00:00"
              readOnly
            />
            <Button 
              size="icon" 
              className="h-8 w-5 rounded-none"
              onClick={() => {
                handleMoveTimestamp(0.1);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> PGN
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Import PGN</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                  <Textarea
                    placeholder="Paste PGN here..."
                    value={importText}
                    onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setImportText(e.target.value)}
                    className="min-h-32 max-h-[50vh]"
                  />
                </div>
                <div>
                  <Button onClick={() => handleImportPgn(importText)} disabled={!importText.trim()} className='w-full'>
                    Import
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              size="sm" 
              className="h-8" 
              variant="outline"
              onClick={handleRotate}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center justify-between bg-slate-100 py-2 px-4 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={navigateToFirst} 
            disabled={currentMoveIndex === 0}
            className="h-8 w-8"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={navigateToPrevious} 
            disabled={currentMoveIndex === 0}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium">
            Move {currentMoveIndex} of {positions.length - 1}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={navigateToNext} 
            disabled={currentMoveIndex === positions.length - 1}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={navigateToLast} 
            disabled={currentMoveIndex === positions.length - 1}
            className="h-8 w-8"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable move list */}
        <ScrollArea className="flex flex-grow h-0" ref={scrollAreaRef}>
          <div className="flex flex-col">
            {renderMoves()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default History;