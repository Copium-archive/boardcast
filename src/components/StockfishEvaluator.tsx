import React, { useState, useEffect, useRef } from 'react';

type EvaluationResult = number | string | null;

// Define a mapping of chess pieces to Unicode symbols
const chessPieceMap: Record<string, string> = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
};

const StockfishEvaluator: React.FC = () => {
  const [fen, setFen] = useState<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [evaluation, setEvaluation] = useState<EvaluationResult>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [engineReady, setEngineReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<string[][]>([]);
  const boardBuffer = useRef<string[][]>([]);
  const stockfishRef = useRef<Worker | null>(null);
  
  // Create a ref to track if component is mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    const engine = new Worker('/stockfish-17-single.js', { type: 'classic' });
    stockfishRef.current = engine;

    engine.onmessage = (e) => {
      // Ensure we don't update state if component is unmounted
      if (!isMountedRef.current) return;
      
      const msg = e.data;
      if (typeof msg !== 'string') return;
      
      console.log('Stockfish message:', msg);
      if (msg.includes('readyok')) setEngineReady(true);
      
      // Handle board display from Stockfish's 'd' command
      if (msg.includes('+---+') || msg.includes('|')) {
        try {
          const boardLines = msg.split('|');
          
          if (boardLines.length === 10) {
            const rowPieces: string[] = [];
            for (let i = 1; i <= 8; i++) {
              const cell = boardLines[i];
              const trimmed = cell.trim();
              if (trimmed.length === 1 && /^[a-zA-Z]$/.test(trimmed)) {
                rowPieces.push(trimmed);
              } else if (trimmed === '') {
                rowPieces.push(' ');
              }
            }
            
            // Instead of buffering, directly update the row in the current board state
            boardBuffer.current.push(rowPieces);
            
            // If we have all 8 rows, update the board state immediately
            if (boardBuffer.current.length === 8) {
              // Create a new array to trigger React re-render
              setBoard([...boardBuffer.current]);
              boardBuffer.current = [];
              
              // Force immediate rendering using requestAnimationFrame
              requestAnimationFrame(() => {
                document.getElementById('chess-board-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              });
            }
          }
        } catch (err) {
          console.error('Error parsing board representation:', err);
        }
      }

      if (msg.includes('bestmove')) {
        const match = msg.match(/bestmove (\w+)/);
        if (match) {
          setBestMove(match[1]);
          setIsAnalyzing(false);
        }
      }

      if (msg.includes('score cp')) {
        const match = msg.match(/score cp (-?\d+)/);
        if (match) setEvaluation(parseInt(match[1], 10) / 100);
      }

      if (msg.includes('score mate')) {
        const match = msg.match(/score mate (-?\d+)/);
        if (match) setEvaluation(`Mate in ${match[1]}`);
      }

      if (msg.includes('Side')) {
        console.log('Side to move:', msg);
        // const match = msg.match(/Side to move: (white|black)/i);
        // if (match) {
        //   setEngineTurn(match[1] === 'white' ? 'White' : 'Black');
        // }
      }
    };

    engine.postMessage('uci');
    engine.postMessage('isready');

    return () => {
      isMountedRef.current = false;
      engine.postMessage('quit');
      engine.terminate();
    };
  }, []);

  const handleEvaluate = () => {
    if (!stockfishRef.current || !engineReady) {
      setError('Engine not ready');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setEvaluation(null);
    setBestMove(null);
    
    // Clear any existing board data
    setBoard([]);
    boardBuffer.current = [];

    const engine = stockfishRef.current;
    engine.postMessage('ucinewgame');
    engine.postMessage(`position fen ${fen}`);
    // Request board display before analysis
    engine.postMessage('d');
    
    // Short delay to allow the board to be processed first
    setTimeout(() => {
      engine.postMessage('go depth 25');
    }, 100);
  };

  const getPieceStyle = (piece: string): React.CSSProperties => {
    if (piece === ' ' || piece === '.') return {};
    
    const isWhite = piece === piece.toUpperCase();
    return {
      color: isWhite ? 'blue' : 'red',
      fontWeight: 'bold'
    };
  };

  // Get the Unicode symbol for a chess piece
  const getPieceSymbol = (piece: string): string => {
    if (piece === ' ' || piece === '.') return '.';
    return chessPieceMap[piece] || piece;
  };

  // Memoize the board to prevent unnecessary re-renders
  const boardDisplay = React.useMemo(() => {
    if (board.length === 0) return null;
    
    return (
      <div id="chess-board-container" className="mt-4 p-2 bg-gray-100 rounded">
        <div className="text-center font-mono">
          <div className="mb-1 text-gray-600 text-sm">Chess Board</div>
          {board.map((row, rowIndex) => (
            <div key={`row-${rowIndex}-${Date.now()}`} className="flex justify-center mb-1">
              <div className="w-6 text-center text-gray-600">{8 - rowIndex}</div>
              <div className="border border-gray-400">
                {row.map((piece, colIndex) => (
                  <span 
                    key={`piece-${rowIndex}-${colIndex}-${Date.now()}`} 
                    style={getPieceStyle(piece)}
                    className={`w-6 inline-block text-center ${
                      (rowIndex + colIndex) % 2 === 0 ? 'bg-gray-200' : 'bg-white'
                    }`}
                  >
                    {getPieceSymbol(piece)}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-center">
            <div className="w-6"></div>
            <div className="flex">
              <span className="w-6 inline-block text-center text-gray-600">a</span>
              <span className="w-6 inline-block text-center text-gray-600">b</span>
              <span className="w-6 inline-block text-center text-gray-600">c</span>
              <span className="w-6 inline-block text-center text-gray-600">d</span>
              <span className="w-6 inline-block text-center text-gray-600">e</span>
              <span className="w-6 inline-block text-center text-gray-600">f</span>
              <span className="w-6 inline-block text-center text-gray-600">g</span>
              <span className="w-6 inline-block text-center text-gray-600">h</span>
            </div>
          </div>
        </div>
      </div>
    );
  }, [board]);

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Stockfish Evaluator</h2>
      <input
        value={fen}
        onChange={(e) => setFen(e.target.value)}
        className="w-full mb-2 p-2 border rounded"
        placeholder="Enter FEN"
      />
      <button
        onClick={handleEvaluate}
        disabled={isAnalyzing || !engineReady}
        className={`w-full py-2 mt-2 text-white rounded ${
          isAnalyzing || !engineReady ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isAnalyzing ? 'Analyzing...' : 'Evaluate'}
      </button>

      {error && <p className="mt-2 text-red-600">{error}</p>}

      {/* Chess Board Display - using the memoized component */}
      {boardDisplay}

      {/* Evaluation Results */}
      {(evaluation !== null || bestMove !== null) && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          {evaluation !== null && (
            <p>
              <strong>Evaluation:</strong>{' '}
              <span className="font-mono">
                {typeof evaluation === 'number'
                  ? `${evaluation > 0 ? '+' : ''}${evaluation.toFixed(2)}`
                  : evaluation}
              </span>
            </p>
          )}
          {bestMove && (
            <p>
              <strong>Best Move:</strong> <span className="font-mono text-blue-600">{bestMove}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StockfishEvaluator;