import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

interface ExportLoadingDialogProps {
  isOpen: boolean;
  progress: number;
  total: number;
  isComplete?: boolean;
  outputLog?: string;
  onCancel?: () => void;
  onFinish?: () => void;
}

export default function ExportLoadingDialog({ 
  isOpen, 
  progress, 
  total,
  isComplete = false,
  outputLog = "",
  onCancel,
  onFinish
}: ExportLoadingDialogProps) {
  const progressPercentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={!isComplete ? onCancel : undefined}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {isComplete ? "Export Complete" : "Evaluating Positions"}
          </DialogTitle>
          <DialogDescription>
            {isComplete 
              ? "Chess evaluations have been calculated and exported successfully."
              : "Calculating chess evaluations for export..."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 flex flex-col">
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

          {/* FFmpeg Output Log */}
          {outputLog && (
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <label className="text-sm font-medium text-muted-foreground">
                Output Log
              </label>
              <div className="flex-1 min-h-0 border rounded-md p-3 bg-muted/50">
                <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto h-full max-h-48 text-muted-foreground">
                  {outputLog}
                </pre>
              </div>
            </div>
          )}

          {isComplete && onFinish && (
            <div className="flex justify-end pt-2">
              <Button onClick={onFinish} className="w-full">
                Finish
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}