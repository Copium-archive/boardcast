import React, { useRef } from 'react';
import { Card } from '@/components/ui/card'; 
import ChessBoard from './ChessBoard'; 
import { AppContext } from '@/App'; 
import { useContext, useEffect } from 'react';
import History from './History';

interface BoardContextType {
  currentFen: string;
  PgnOperation: React.RefObject<string|null>;
}

export const BoardContext = React.createContext<BoardContextType>({
  currentFen: '',
  PgnOperation: { current: null }
});

function AnalysisBoard() {
  const {timestamps, currentMoveIndex, setCurrentMoveIndex, positions} = useContext(AppContext);
  const PgnOperation = useRef<string|null>(null);
  const currentFen = positions[currentMoveIndex];

  useEffect(() => {
    console.log(timestamps);
    if(PgnOperation.current == 'append' || PgnOperation.current == 'remove') {
      setCurrentMoveIndex(positions.length - 1);
      return;
    }
    setCurrentMoveIndex(0);
    PgnOperation.current = null;
  }, [positions, setCurrentMoveIndex]);
  
  return (
    <Card className="w-1/4 flex flex-col p-0 gap-1">
      <BoardContext.Provider value={{ currentFen, PgnOperation }}>
        <ChessBoard />
        <History/>
      </BoardContext.Provider>
    </Card>
  );
}

export default AnalysisBoard;
