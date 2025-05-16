import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { open } from '@tauri-apps/plugin-dialog';
// import { invoke, convertFileSrc} from '@tauri-apps/api/core';
import {convertFileSrc} from '@tauri-apps/api/core';
import AnalysisBoard from "./components/AnalysisBoard";
import VideoContainer from "./components/VideoContainer";
import { useState } from "react";
import React from "react";
import { Chess } from "chess.js";

interface AppContextType {
  currentFen: string;
  setCurrentFen: React.Dispatch<React.SetStateAction<string>>;
}

export const AppContext = React.createContext<AppContextType>({
  currentFen: "",
  setCurrentFen: () => {},
});

function App() {
  const chess = new Chess();
  const [currentFen, setCurrentFen] = useState<string>(chess.fen());
  // const [scriptOutput, setScriptOutput] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);

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


  return (
    <div className="w-full h-screen flex flex-col bg-muted p-2 gap-0">
      <div className="flex flex-1 gap-2">
        <AppContext.Provider value={{currentFen, setCurrentFen}}>
          <Card className="flex-1 flex flex-col p-2 gap-2">
            <Button onClick={handleLoadVideo}>Load Local Video</Button>
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
