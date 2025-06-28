import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { open } from '@tauri-apps/plugin-dialog';
import { invoke, convertFileSrc} from '@tauri-apps/api/core';
import { writeTextFile} from '@tauri-apps/plugin-fs';
import AnalysisBoard from "./components/AnalysisBoard";
import VideoContainer, { VideoContainerRef } from "./components/VideoContainer";
import ExportLoadingDialog from "./components/ExportLoadingDialog";
import {useEffect, useRef, useState } from "react";
import React from "react";
import { Chess } from "chess.js";
import { useBatchEval } from "./lib/useBatchEval";

interface AppContextType {
  timestamps: (number | null)[];
  setTimestamps: React.Dispatch<React.SetStateAction<(number | null)[]>>;
  moves: string[];
  setMoves: React.Dispatch<React.SetStateAction<string[]>>;
  positions: string[];
  setPositions: React.Dispatch<React.SetStateAction<string[]>>;
  currentMoveIndex: number;
  setCurrentMoveIndex: React.Dispatch<React.SetStateAction<number>>;
  EvalCache: React.RefObject<{ [key: string]: { evaluation: number | string | null; bestMove: string | null } }>;
  isEditingContour: boolean;
  setIsEditingContour: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AppContext = React.createContext<AppContextType>({
  timestamps: [],
  setTimestamps: () => {},
  moves: [],
  setMoves: () => {},
  positions: [],
  setPositions: () => {},
  currentMoveIndex: 0,
  setCurrentMoveIndex: () => {},
  EvalCache: { current: {} },
  isEditingContour: false,
  setIsEditingContour: () => {},
});

function App() {
  const [timestamps, setTimestamps] = useState<(number | null)[]>([null]);
  const chess = new Chess();
  const [positions, setPositions] = useState<string[]>([chess.fen()]); // FEN strings
  const [moves, setMoves] = useState<string[]>([]); // Move history (SAN)
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  const EvalCache = useRef<{ [fen: string]: { evaluation: number; bestMove: string } }>({});  
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [shouldCompleteExport, setShouldCompleteExport] = useState(false);
  const [isExportComplete, setIsExportComplete] = useState(false);
  const [outputLog, setOutputLog] = useState<string>("");
  
  // State for batch evaluation queue
  const [fenQueue, setFenQueue] = useState<string[]>([]);
  const { remaining } = useBatchEval({ fenQueue, setFenQueue, EvalCache});
  const [videoPath, setVideoPath] = useState<string | null>("http://asset.localhost/C%3A%5CUsers%5CUser%5CDocuments%5Cboardcast%5Cpy-util%5Cstatic.mp4");
  
  // Add ref for VideoContainer
  const videoContainerRef = useRef<VideoContainerRef>(null);

  const [isEditingContour, setIsEditingContour] = useState(false);
  
  // Monitor evaluation progress
  useEffect(() => {
    if (isExporting && fenQueue !== null) {
      const progress = exportTotal - remaining;
      setExportProgress(progress);
      
      // Check if evaluation is complete
      if (remaining === 0 && fenQueue.length === 0) {
        // Trigger export completion
        setShouldCompleteExport(true);
      }
    }
  }, [remaining, fenQueue, isExporting, exportTotal]);

useEffect(() => {
  if (!shouldCompleteExport) return;
  
  // Get board size from VideoContainer
  const boardSize = videoContainerRef.current?.calculateBoardSize();
  const corner = videoContainerRef.current?.calculateOffset();
  
  // Prepare export data with evaluations and board size
  const exportData = {
    framePerMove: 5,
    timePerMove: 0.2,
    positions,
    moves: [null, ...moves],
    x_offset: corner?.x || 0,
    y_offset: corner?.y || 0,
    timestamps,
    boardSize,
    evaluations: positions.map(fen => ({
      evaluation: fen in EvalCache.current ? EvalCache.current[fen].evaluation : null,
      bestMove: fen in EvalCache.current ? EvalCache.current[fen].bestMove : null
    }))
  };

  const customPath = "C:/Users/User/Documents/boardcast/remotion/export.json";

  writeTextFile(customPath, JSON.stringify(exportData, null, 2))
    .then(async () => {
      console.log("Exported data with evaluations to:", customPath);
      setIsExportComplete(true);

      // Run the combined video processing script
      try {
        console.log("Starting video processing pipeline...");
        
        const result = await invoke<string>("run_python_script", {
          script: "export.py", // Your new combined script name
          cliArgs: [],
          osEnv: "Windows"
        });

        console.log("Video processing pipeline completed");
        console.log("Python script output:", result);

        // Try to parse the result as JSON to get structured feedback
        try {
          const parsedResult = JSON.parse(result);
          
          if (parsedResult.success) {
            setOutputLog(`✅ Video processing completed successfully!\n\n${parsedResult.message || ''}\n\nRender Output:\n${parsedResult.render_output || 'No render output'}\n\nOverlay Output:\n${parsedResult.overlay_output || 'No overlay output'}`);
          } else {
            setOutputLog(`❌ Video processing failed:\n\n${parsedResult.error}\n\nRender Output:\n${parsedResult.render_output || 'No render output'}\n\nOverlay Output:\n${parsedResult.overlay_output || 'No overlay output'}`);
          }
        } catch {
          // If result is not JSON, treat it as plain text output
          setOutputLog(result);
        }

      } catch (err) {
        console.error("Video processing pipeline error:", err);
        setOutputLog(`❌ Pipeline Error: ${String(err)}`);
      }
    })
    .catch((error) => {
      console.error("Failed to export data:", error);
      // Reset export state on error
      setIsExporting(false);
      setExportProgress(0);
      setExportTotal(0);
      setFenQueue([]);
      setShouldCompleteExport(false);
    });
    
}, [shouldCompleteExport]);

  // Handle finish button click
  const handleFinishExport = () => {
    setIsExporting(false);
    setExportProgress(0);
    setExportTotal(0);
    setFenQueue([]);
    setShouldCompleteExport(false);
    setIsExportComplete(false);
  };
  
  const handleLoadVideo = async () => {
    const selected = await open({
      filters: [{ name: 'Video', extensions: ['mp4', 'webm', 'ogg'] }]
    });

    if (typeof selected === 'string') {
      // Safely convert the local file path using Tauri's convertFileSrc
      const safeVideoUrl = convertFileSrc(selected);
      console.log("Selected video path:", safeVideoUrl);
      setVideoPath(safeVideoUrl);
    }
  };

  // Replace the existing handleExport function
  const handleExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    setIsExportComplete(false);
    
    // Calculate positions that need evaluation
    const positionsToEvaluate = positions.filter(fen => 
      !(fen in EvalCache.current) || 
      EvalCache.current[fen].evaluation === null || 
      EvalCache.current[fen].bestMove === null
    );
    
    setExportTotal(positionsToEvaluate.length);
    
    // If no positions need evaluation, trigger immediate export
    if (positionsToEvaluate.length === 0) {
      setShouldCompleteExport(true);
      return;
    }
    
    // Start batch evaluation by setting the queue
    setFenQueue(positionsToEvaluate);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-muted p-2 gap-0">
      <div className="flex flex-1 gap-2">
        <AppContext.Provider value={{
          timestamps, setTimestamps,
          currentMoveIndex, setCurrentMoveIndex, 
          moves, setMoves, 
          positions, setPositions,
          EvalCache,
          isEditingContour,
          setIsEditingContour,
        }}
          >
          <Card className="flex-1 flex flex-col p-2 gap-2">
            <div className="flex gap-2">
              <Button onClick={handleLoadVideo}>Load Local Video</Button>
              <Button 
                onClick={handleExport} 
                variant="outline"
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
              <Button 
                onClick={() => setIsEditingContour(!isEditingContour)} 
                variant="outline"
                disabled={isExporting}
              >
                {isEditingContour ? <Trash2 className="h-4 w-4" /> : 'Edit'}
              </Button>

            </div>
            <VideoContainer ref={videoContainerRef} videoPath={videoPath} />
          </Card>
          <AnalysisBoard />
          
          <ExportLoadingDialog 
            isOpen={isExporting}
            progress={exportProgress}
            total={exportTotal}
            isComplete={isExportComplete}
            outputLog={outputLog}
            onFinish={handleFinishExport}
          />
        </AppContext.Provider>
      </div>
    </div>
  );
}

export default App;