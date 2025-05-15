import React, {useContext, useEffect, useState } from 'react';
import { AppContext } from '@/App';
import { Chess } from 'chess.js';

interface AnalysisPanelProps {
  pgn: string;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ pgn }) => {
  const [positions, setPositions] = useState<string[]>([]); // FEN strings
  const [moves, setMoves] = useState<string[]>([]);         // Move history (SAN)
  const {setCurrentFen} = useContext(AppContext);

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
    // console.log(tempMoves.length);

    setMoves(tempMoves);
    setPositions(tempPositions);
  }, [pgn]);

  const handleMoveClick = (move_idx: number) => {
    setCurrentFen(positions[move_idx]);
  }

  return (
    <div className="flex flex-grow flex-col bg-amber-300 h-full">
      {/* Fixed header */}
      <div className="h-14 bg-amber-700" />
  
      {/* Scrollable content area */}
      <div className="flex flex-grow flex-wrap flex-row overflow-y-auto">
        <div
          key={0}
          onClick={() => handleMoveClick(0)}
          style={{ 
            boxSizing: 'border-box',
            boxShadow: `0px 0px 0px 1px inset #D1D5DB` 
          }}
          className="w-1/2 bg-white px-4 py-2 text-sm text-gray-800"
        >
          {`#0: `}
        </div>

        {moves.map((move, index) => (
          <div
            key={index + 1}
            onClick={() => handleMoveClick(index + 1)}
            style={{ 
              boxSizing: 'border-box',
              boxShadow: `0px 0px 0px 1px inset #D1D5DB` 
            }}
          className="w-1/2 bg-white px-4 py-2 text-sm text-gray-800"
          >
            {`#${index + 1}: ${move}`}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisPanel;
