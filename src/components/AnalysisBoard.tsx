import React from 'react';
import { Card } from '@/components/ui/card'; 
import { AppContext } from '@/App'; 
import { useContext } from 'react';
import ChessBoard from './ChessBoard'; 
import History from './History';
import BoardOrientation from './BoardOrientation';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Clapperboard } from 'lucide-react';

interface BoardContextType {
  currentFen: string;
}

export const BoardContext = React.createContext<BoardContextType>({
  currentFen: '',
});

function AnalysisBoard() {
  const {
    currentMoveIndex, 
    positions, 
    selectingOrientation, 
    chessboardRef, 
    videoContainerRef,
    timestamps
  } = useContext(AppContext);
  const currentFen = positions[currentMoveIndex];
  
  return (
    <Card className="w-1/4 flex flex-col p-0 gap-1">
      <BoardContext.Provider value={{ currentFen }}>
        {!selectingOrientation ? (
          <>
        <ContextMenu>
          <ContextMenuTrigger>
            <ChessBoard ref={chessboardRef}/>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => {
                const t = timestamps[currentMoveIndex];
                if (t != null) {
                  videoContainerRef.current?.seek([t]);
                }
              }}
            >
              <Clapperboard/>
              Go to frame
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
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
