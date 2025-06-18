import { useRef, useState, useEffect } from 'react';

interface UseBatchEvalProps {
    fenQueue: string[];
    setFenQueue: React.Dispatch<React.SetStateAction<string[]>>;
    EvalCache: React.RefObject<{ [key: string]: { evaluation: number | string | null; bestMove: string | null } }>;
}
export function useBatchEval({fenQueue, setFenQueue, EvalCache}: UseBatchEvalProps) {
    const evaluation = useRef<number | string | null>(null)
    const bestMove = useRef<string | null>(null);
    const [remaining, setRemaining] = useState(0);

    const isMountedRef = useRef(true);
    const stockfishRef = useRef<Worker | null>(null);
    const engineReady = useRef<boolean>(false);
    const analyzingFen = useRef<string | null>(null);

    useEffect(() => {
        const engine = new Worker('/stockfish-17-single.js', { type: 'classic' });
        stockfishRef.current = engine;

        engine.onmessage = (e) => {
            // Ensure we don't update state if component is unmounted
            if (!isMountedRef.current) return;
            
            const msg = e.data;
            if (typeof msg !== 'string') return;
            
            if (msg.includes('readyok')) {
                engineReady.current = true;
                // console.log("engine ready (useRef)", engineReady.current);
            }

            if (msg.includes('bestmove')) {
                const match = msg.match(/bestmove (\w+)/);
                if (match) {
                    bestMove.current = match[1];
                    if(analyzingFen.current !== null) {
                        EvalCache.current[analyzingFen.current] = { 
                            evaluation: evaluation.current, 
                            bestMove: bestMove.current 
                        };
                        setFenQueue((prevFenQueue: string[]) => prevFenQueue.slice(1))
                    }
                }
            }

            if (msg.includes('score cp')) {
                const match = msg.match(/score cp (-?\d+)/);
                if (match) {
                    const score = parseInt(match[1], 10) / 100;
                    evaluation.current = score;
                }
            }

            if (msg.includes('score mate')) {
                const match = msg.match(/score mate (-?\d+)/);
                console.log("score mate", match);
                if (match) {
                    evaluation.current = `M${match[1]}`;
                }
            }
        };

        engine.onerror = (e) => {
            console.error("Stockfish error:", e);
            // We could add recovery logic here if needed
        };

        engine.postMessage('uci');
        engine.postMessage('isready');

        return () => {
            isMountedRef.current = false;
            
            // Properly terminate engine
            try {
                if (stockfishRef.current) {
                    stockfishRef.current.postMessage('quit');
                    stockfishRef.current.terminate();
                    stockfishRef.current = null;
                }
            } catch (e) {
                console.error("Error terminating engine:", e);
            }
        };
    }, []);
    
    useEffect(() => {
        setRemaining(fenQueue.length);
        if (fenQueue.length === 0) {
            return;
        }
        const fen = fenQueue[0];
    
        if (fen in EvalCache.current) {
            setFenQueue((prevFenQueue: string[]) => prevFenQueue.slice(1))
            return;
        }
        if (!stockfishRef.current || !engineReady) {
            return;
        }
    
        analyzingFen.current = fen;
        
        const engine = stockfishRef.current;
        engine.postMessage('ucinewgame');
        engine.postMessage(`position fen ${fen}`);
        engine.postMessage('go depth 20'); // Reduced depth for stability

    }, [fenQueue, engineReady]);

    return {remaining}
}