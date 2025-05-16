import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '@/App';
import { Chess } from 'chess.js';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';

interface AnalysisPanelProps {
  pgn: string;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ pgn }) => {
  const [positions, setPositions] = useState<string[]>([]); // FEN strings
  const [moves, setMoves] = useState<string[]>([]); // Move history (SAN)
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  const { setCurrentFen } = useContext(AppContext);

  useEffect(() => {
    if (!pgn) return;
    
    const chess = new Chess();
    const tempPositions: string[] = [chess.fen()];
    const tempMoves: string[] = [];
    
    try {
      chess.loadPgn(pgn);
    } catch (error) {
      console.error('Invalid PGN', error);
      setPositions([]);
      setMoves([]);
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
    setCurrentMoveIndex(0);
  }, [pgn]);

  useEffect(() => {
    if (positions.length > 0 && currentMoveIndex < positions.length) {
      setCurrentFen(positions[currentMoveIndex]);
    }
  }, [currentMoveIndex, positions, setCurrentFen]);

  // Add keyboard event listener for up/down arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        // Next position
        if (currentMoveIndex < positions.length - 1) {
          setCurrentMoveIndex(currentMoveIndex + 1);
        }
      } else if (e.key === 'ArrowUp') {
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
  }, [currentMoveIndex, positions.length]);

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

  return (
    <Card className="flex flex-col h-full border-0 rounded-none p-0" id="cac">
      <CardContent className="p-0 flex flex-col h-full">
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

export default AnalysisPanel;