import { useEffect, useRef, useState } from "react";
import { BoardContext } from "@/components/AnalysisBoard";
import { useContext } from "react";

function useEval() {
    const { currentFen } = useContext(BoardContext);
    const [evaluation, setEvaluation] = useState<number | string | null>(0);
    const [bestMove, setBestMove] = useState<string | null>(null);
    const isMountedRef = useRef(true);
    const stockfishRef = useRef<Worker | null>(null);
    const pendingFen = useRef<string | null>(null);
    const analyzingFen = useRef<string | null>(null);
    const engineReady = useRef<boolean>(false);
    const EvalCache = useRef<{ [key: string]: { evaluation: number | string | null; bestMove: string | null } }>({});

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
                console.log("engine ready (useRef)", engineReady.current);
            }

            if (msg.includes('bestmove')) {
                const match = msg.match(/bestmove (\w+)/);
                if (match) {
                    setBestMove(match[1]);
                    if(analyzingFen.current !== null) {
                        EvalCache.current[analyzingFen.current].bestMove = match[1];
                    }
                }
                
                // Mark analysis as complete
                analyzingFen.current = null;
                
                // Check if we have a pending FEN to analyze
                if (pendingFen.current !== null) {
                    startAnalysis(pendingFen.current);
                    pendingFen.current = null;
                }
            }

            if (msg.includes('score cp')) {
                const match = msg.match(/score cp (-?\d+)/);
                if (match) {
                    const score = parseInt(match[1], 10) / 100;
                    if(analyzingFen.current !== null) {
                        EvalCache.current[analyzingFen.current].evaluation = score;
                    }
                    setEvaluation(score);
                }
            }

            if (msg.includes('score mate')) {
                const match = msg.match(/score mate (-?\d+)/);
                console.log("score mate", match);
                if (match) {
                    if(analyzingFen.current !== null) {
                        EvalCache.current[analyzingFen.current].evaluation = `M${match[1]}`;
                    }
                    setEvaluation(`M${match[1]}`);
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

    // Function to start a new analysis
    const startAnalysis = (fen: string) => {
        if (fen in EvalCache.current) {
            if(EvalCache.current[fen].bestMove !== null && EvalCache.current[fen].evaluation !== null) {
                setEvaluation(EvalCache.current[fen].evaluation);
                setBestMove(EvalCache.current[fen].bestMove);
                return;
            }
        }
        if (!stockfishRef.current || !engineReady) {
            return;
        }

        EvalCache.current[fen] = { evaluation: null, bestMove: null };
        analyzingFen.current = fen;
        setEvaluation(null);
        setBestMove(null);
        
        const engine = stockfishRef.current;
        engine.postMessage('ucinewgame');
        engine.postMessage(`position fen ${fen}`);
        engine.postMessage('go depth 20'); // Reduced depth for stability
    };

    // Effect to handle FEN changes
    useEffect(() => {
        if (!engineReady || !stockfishRef.current) {
            return;
        }

        // If engine is currently analyzing, store this FEN to process later
        if (analyzingFen.current !== null) {
            pendingFen.current = currentFen;
            return;
        }
        
        // Otherwise start analysis immediately
        startAnalysis(currentFen);
    }, [currentFen, engineReady]);

    return {
        evaluation, 
        bestMove, 
    };
}

export default useEval;