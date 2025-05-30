function EvalBar({ score, turn }: { score: number | string | null, turn: 'w' | 'b' }) {
    const evalToBarPercent = (
      evalScore: number | string | null,
      scale: number = 4
    ): number => {
      if (evalScore === null) return 50;
  
      if (typeof evalScore === 'string' && evalScore.includes('M')) {
        if(evalScore === 'M0') return 50;
        if(evalScore.includes('-')) return turn === 'w' ? 0 : 100;
        return turn === 'w' ? 100 : 0;
      }
  
      let numericScore = typeof evalScore === 'string' ? parseFloat(evalScore) : evalScore;
  
      if (turn === 'b') {
        numericScore = -numericScore;
      }
  
      const normalized = Math.atan(numericScore / scale) / Math.PI + 0.5;

      return normalized * 100;
    };

    const formatScore = (score: number | string | null, advantage: 'w' | 'b'): string => {
      if (score === null) return '???'
      if (typeof score === 'string' && score.includes('M')) {
        return score;
      }
      const numericScore = typeof score === 'string' ? parseFloat(score) : score ?? 0;
      return (advantage === 'w') ? Math.abs(numericScore).toString() : (-Math.abs(numericScore)).toString();
    }

    const whitePercent = evalToBarPercent(score);
  
  
    return (
      <div className="flex flex-1 h-full relative overflow-hidden">
        <div 
          className="bg-zinc-200 absolute bottom-0 left-0 right-0 transition-all duration-300 ease-in-out flex flex-col-reverse"
          style={{ height: `${whitePercent}%` }}
          >
          {(whitePercent >= 50) && <span className="text-center text-[1vw]">{formatScore(score, 'w')}</span>}
        </div>

        <div 
          className="bg-black absolute top-0 left-0 right-0 transition-all duration-300 ease-in-out text-center flex flex-col"
          style={{ height: `${100 - whitePercent}%` }}
        >
          {(whitePercent < 50) && <span className="text-white text-center text-[1vw]">{formatScore(score, 'b')}</span>}
        </div>
  
        {/* Center line */}
        <div className="absolute left-0 right-0 border-t border-amber-500" style={{ top: '50%' }} />
      </div>
    );
  }
  
  export default EvalBar;
  