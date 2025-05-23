import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Move } from 'lucide-react';

interface ConfirmNewLineProps {
  handleConfirm: () => void;
  onCancel?: () => void;
}

function ConfirmNewLine({ handleConfirm, onCancel }: ConfirmNewLineProps) {
  const [open, setOpen] = useState(true);

  // Handle dialog close without confirmation
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onCancel?.();
    }
    setOpen(newOpen);
  };

  const handleConfirmClick = () => {
    handleConfirm();
    setOpen(false);
  };

  const handleCancelClick = () => {
    onCancel?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900 mt-2">
            Start New Analysis Line?
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            This move will deviate from the current analysis line. A new branch will be created from this position.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-3">
          <Button 
            onClick={handleConfirmClick}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-medium"
          >
            <Move className="h-4 w-4 mr-2" />
            Start New Line
          </Button>
          
          <Button 
            onClick={handleCancelClick}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmNewLine;