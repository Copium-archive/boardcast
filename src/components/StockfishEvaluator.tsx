import React, { useState, useEffect, useRef } from 'react';
import { createStockfish } from '../lib/stockfishWorkerWrapper';

type EvaluationResult = number | string | null;

const StockfishEvaluator: React.FC = () => {
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [evaluation, setEvaluation] = useState<EvaluationResult>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stockfishRef = useRef<Worker | null>(null);

  useEffect(() => {
    const engine = createStockfish();
    stockfishRef.current = engine;

    engine.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg !== 'string') return;

      if (msg.includes('readyok')) setEngineReady(true);

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
    };

    engine.postMessage('uci');
    engine.postMessage('isready');

    return () => {
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

    const engine = stockfishRef.current;
    engine.postMessage('ucinewgame');
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage('go depth 15');
  };

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
