import React from 'react';

function EvalBar({ score }: { score: number | string | null }) {
  const evalToBarPercent = (
    evalScore: number | string | null,
    scale: number = 4
  ): number => {
    if (evalScore === null) return 50;

    let score: number;

    if (typeof evalScore === 'string' && evalScore.includes('#')) {
      const mateIn = parseInt(evalScore.replace('#', ''), 10);
      const sign = evalScore.startsWith('-') ? -1 : 1;
      score = sign * (100 - Math.abs(mateIn));
    } else {
      score = typeof evalScore === 'number' ? evalScore : 0;
    }

    const normalized = 1 / (1 + Math.pow(10, -score / scale));
    return normalized * 100;
  };

  const whitePercent = evalToBarPercent(score);

  return (
    <div className="bg-amber-300 flex flex-1 flex-col-reverse overflow-hidden h-full">
      <div
        className="bg-zinc-200 transition-all duration-300 ease-in-out"
        style={{ height: `${whitePercent}%` }}
      />
      <div className="bg-black flex-grow" />
    </div>
  );
}

export default EvalBar;