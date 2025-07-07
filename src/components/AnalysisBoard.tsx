import React from 'react';
import { Card } from '@/components/ui/card'; 
import { AppContext } from '@/App'; 
import { useContext } from 'react';
import ChessBoard from './ChessBoard'; 
import History from './History';
import BoardOrientation from './BoardOrientation';

interface BoardContextType {
  currentFen: string;
  // PgnOperation: React.RefObject<string|null>;
}

export const BoardContext = React.createContext<BoardContextType>({
  currentFen: '',
});

function AnalysisBoard() {
  const {currentMoveIndex, positions, executingSegmentation} = useContext(AppContext);
  const currentFen = positions[currentMoveIndex];
  
  return (
    <Card className="w-1/4 flex flex-col p-0 gap-1">
      <BoardContext.Provider value={{ currentFen }}>
        {!executingSegmentation ? (
          <>
        <ChessBoard />
        <History />
          </>
        ) : (
          <BoardOrientation />
        )}
      </BoardContext.Provider>
    </Card>
  );
}

export default AnalysisBoard;
