import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function PawnPromotion({ color, handlePromotion }: { color: 'w' | 'b', handlePromotion: (promoteTo: 'q' | 'r' | 'b' | 'n' | null) => void }) {
  const [open, setOpen] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  
  // Use the correct symbol set based on color
  const pieces = [
    { type: 'q', name: 'Queen', symbol: color === 'w' ? '♕' : '♛' },
    { type: 'r', name: 'Rook', symbol: color === 'w' ? '♖' : '♜' },
    { type: 'b', name: 'Bishop', symbol: color === 'w' ? '♗' : '♝' },
    { type: 'n', name: 'Knight', symbol: color === 'w' ? '♘' : '♞' },
  ];

  const handlePromotionSelect = (pieceType: 'q' | 'r' | 'b' | 'n') => {
    handlePromotion(pieceType);
    setOpen(false);
  };
  
  // Handle dialog close without selection
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // If dialog is closing and no piece was selected
      handlePromotion(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-gray-800">
            Promote To
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-center space-x-3 p-2">
          {pieces.map((piece) => (
            <button
              key={piece.type}
              onClick={() => handlePromotionSelect(piece.type as 'q' | 'r' | 'b' | 'n')}
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
      </DialogContent>
    </Dialog>
  );
}

export default PawnPromotion;