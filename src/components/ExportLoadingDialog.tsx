import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ExportLoadingDialogProps {
  isOpen: boolean;
  progress: number;
  total: number;
  onCancel?: () => void;
}

export default function ExportLoadingDialog({ 
  isOpen, 
  progress, 
  total,
  onCancel 
}: ExportLoadingDialogProps) {
  const progressPercentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Evaluating Positions
          </DialogTitle>
          <DialogDescription>
            Calculating chess evaluations for export...
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{progress}/{total}</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            {progressPercentage}% complete
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}