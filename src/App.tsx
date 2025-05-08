import { Card } from "@/components/ui/card";
import ChessBoard from "@/components/ChessBoard";
// import StockfishEvaluator from "@/components/StockfishEvaluator";
// import EvalBar from "./components/EvalBar";

function App() {
  return (
    <div className="w-full h-screen flex flex-col bg-muted p-2">
      
      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left Section - Video */}
        <Card className="flex-1 flex flex-col">

        </Card>
        
        {/* Right Section - Analysis Board + Move Interpreter */}
        <Card className="w-[30%] flex flex-col p-0">
          <ChessBoard />
        </Card>
      </div>
    </div>
    // <StockfishEvaluator></StockfishEvaluator>
  );
}

export default App;