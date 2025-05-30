import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { open } from '@tauri-apps/plugin-dialog';
// import { invoke, convertFileSrc} from '@tauri-apps/api/core';
import { writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';
import AnalysisBoard from "./components/AnalysisBoard";
import VideoContainer from "./components/VideoContainer";
import {useState } from "react";
import React from "react";
import { Chess } from "chess.js";

interface AppContextType {
  timestamps: (number | null)[];
  setTimestamps: React.Dispatch<React.SetStateAction<(number | null)[]>>;
  moves: string[];
  setMoves: React.Dispatch<React.SetStateAction<string[]>>;
  positions: string[];
  setPositions: React.Dispatch<React.SetStateAction<string[]>>;
  currentMoveIndex: number;
  setCurrentMoveIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const AppContext = React.createContext<AppContextType>({
  timestamps: [],
  setTimestamps: () => {},
  moves: [],
  setMoves: () => {},
  positions: [],
  setPositions: () => {},
  currentMoveIndex: 0,
  setCurrentMoveIndex: () => {}
});

function App() {
  const [timestamps, setTimestamps] = useState<(number | null)[]>([null]);
  const chess = new Chess();
  const [positions, setPositions] = useState<string[]>([chess.fen()]); // FEN strings
  const [moves, setMoves] = useState<string[]>([]); // Move history (SAN)
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  // const [scriptOutput, setScriptOutput] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>("http://asset.localhost/C%3A%5CUsers%5CUser%5CDownloads%5Cuhd_30fps.mp4");
  // useEffect(() => {console.log(positions); console.log(moves)}, [positions, moves])

  // const handleRunScript = async () => {
  //   try {
  //     const result = await invoke<string>("run_python_script", {
  //       script: "generate_frame.py",
  //       cliArgs: []
  //     });
  //     setScriptOutput(result);
  //     console.log("Python script output:", result);
  //   } catch (error) {
  //     console.error("Failed to run script:", error);
  //     setScriptOutput("Error running script.");
  //   }
  // };

  const handleLoadVideo = async () => {
    const selected = await open({
      filters: [{ name: 'Video', extensions: ['mp4', 'webm', 'ogg'] }]
    });

    if (typeof selected === 'string') {
      // Safely convert the local file path using Tauri's convertFileSrc
      const safeVideoUrl = convertFileSrc(selected);
      setVideoPath(safeVideoUrl);
    }
  };

  const handleExport = async () => {
    const data = {
      positions,
      moves: [null, ...moves],
      timestamps
    };
    try {
      await writeTextFile(
        'export.json', 
        JSON.stringify(data, null, 2), 
        { baseDir: BaseDirectory.AppLocalData }
      );
      // Construct the file URL for the exported file
      const filePath = `C:/Users/User/AppData/Local/com.tauri.dev/export.json`;
      console.log("Exported data to export.json. File URL:", filePath);
    } catch (error) {
      console.error("Failed to export data:", error);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-muted p-2 gap-0">
      <div className="flex flex-1 gap-2">
        <AppContext.Provider value={{
          timestamps, setTimestamps,
          currentMoveIndex, setCurrentMoveIndex, 
          moves, setMoves, 
          positions, setPositions}}
          >
          <Card className="flex-1 flex flex-col p-2 gap-2">
            <div className="flex gap-2">
              <Button onClick={handleLoadVideo}>Load Local Video</Button>
              <Button onClick={handleExport} variant="outline">Export</Button>
            </div>
            <VideoContainer videoPath={videoPath} />
            {/* <Button onClick={handleRunScript}>Run Python Script</Button> */}
            {/* {scriptOutput && (
              <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {scriptOutput}
              </div>
            )} */}
          </Card>
          <AnalysisBoard />
        </AppContext.Provider>
      </div>
    </div>
  );
}

export default App;