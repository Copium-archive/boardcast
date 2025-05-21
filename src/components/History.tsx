import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '@/App';
import { Chess } from 'chess.js';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BoardContext } from './AnalysisBoard';

const History: React.FC = () => {
  const { currentMoveIndex, setCurrentMoveIndex, moves, setMoves, positions, setPositions } = useContext(AppContext);
  const { PgnOperation } = useContext(BoardContext);
  const [currentTimestamp, setCurrentTimestamp] = useState<string>("00:00:00");
  const [importPgnDialog, setImportPgnDialog] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");

  // Add keyboard event listener for 'w'/'s' keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's') {
        // Next position
        if (currentMoveIndex < positions.length - 1) {
          setCurrentMoveIndex(currentMoveIndex + 1);
        }
      } else if (e.key === 'w') {
        // Previous position
        if (currentMoveIndex > 0) {
          setCurrentMoveIndex(currentMoveIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentMoveIndex, positions.length, setCurrentMoveIndex]);

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
    PgnOperation.current = 'import'
    
    // Reset dialog state if needed
    if (shouldCloseDialog) {
      setImportText("");
      setImportPgnDialog(false);
    }
  };

  return (
    <Card className="flex flex-col h-full border-0 rounded-none p-0">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Top controls - Timestamp and Import PGN */}
        <div className="flex items-center justify-between bg-slate-100 py-2 px-2 border-b">
          <div className="flex items-center space-x-2">
            <Input 
              type="text" 
              value={currentTimestamp}
              onChange={(e) => setCurrentTimestamp(e.target.value)}
              className="h-8 w-24 text-xs bg-white"
              placeholder="00:00:00"
            />
          </div>
          
          <Dialog open={importPgnDialog} onOpenChange={setImportPgnDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> PGN
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import PGN</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Paste PGN here..."
                value={importText}
                onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setImportText(e.target.value)}
                className="min-h-32"
              />
              <Button onClick={() => handleImportPgn(importText)} disabled={!importText.trim()}>
                Import
              </Button>
            </DialogContent>
          </Dialog>
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
        <ScrollArea className="flex flex-grow h-0">
          <div className="grid grid-cols-2">
            <div
              onClick={() => handleMoveClick(0)}
              className={`col-span-2 px-4 py-2 text-sm border-b hover:bg-slate-100 cursor-pointer ${
                currentMoveIndex === 0 ? 'bg-blue-100 font-medium' : ''
              }`}
            >
              Initial Position
            </div>

            {moves.map((move, index) => (
              <div
                key={index + 1}
                onClick={() => handleMoveClick(index + 1)}
                className={`px-4 py-2 text-sm border-b ${
                  index % 2 === 0 ? 'border-r' : ''
                } hover:bg-slate-100 cursor-pointer ${
                  currentMoveIndex === index + 1 ? 'bg-blue-100 font-medium' : ''
                }`}
              >
                {index + 1}. {move}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default History;