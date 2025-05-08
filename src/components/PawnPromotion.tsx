import { useState } from 'react';

function PawnPromotion({ color, handlePromotion }: { color: 'w' | 'b', handlePromotion: (promoteTo: 'q' | 'r' | 'b' | 'n') => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  
  // Use the correct symbol set based on color
  const pieces = [
    { type: 'q', name: 'Queen', symbol: color === 'w' ? '♕' : '♛' },
    { type: 'r', name: 'Rook', symbol: color === 'w' ? '♖' : '♜' },
    { type: 'b', name: 'Bishop', symbol: color === 'w' ? '♗' : '♝' },
    { type: 'n', name: 'Knight', symbol: color === 'w' ? '♘' : '♞' },
  ];

  return (
    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col items-center">
        <h2 className="text-xl font-bold mb-3 text-gray-800">
          Promote To
        </h2>
        <div className="flex space-x-3">
          {pieces.map((piece) => (
            <button
              key={piece.type}
              onClick={() => handlePromotion(piece.type as 'q' | 'r' | 'b' | 'n')}
              onMouseEnter={() => setHovered(piece.type)}
              onMouseLeave={() => setHovered(null)}
              className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center ${
                hovered === piece.type 
                  ? 'bg-amber-100 shadow-md transform scale-105' 
                  : 'bg-gray-50 hover:bg-amber-50'
              }`}
            >
              <div className={`text-5xl mb-1 ${
                hovered === piece.type ? 'text-amber-600' : 
                color === 'b' ? 'text-gray-900' : 'text-gray-800'
              }`}>
                {piece.symbol}
              </div>
              <span className={`text-sm font-medium ${hovered === piece.type ? 'text-amber-600' : 'text-gray-700'}`}>
                {piece.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PawnPromotion;