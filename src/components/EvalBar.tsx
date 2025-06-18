function EvalBar({
  score,
  turn,
  evalchange,
  textSize,
}: {
  score: number | string | null;
  turn: "w" | "b";
  evalchange?: {
    previousEval: number | string | null;
    progress: number;
  };
  textSize?: string;
}) {
  // Derived constant: disable CSS animation when evalchange is provided (for Remotion)
  const disableAnimation = evalchange !== undefined;

  const evalToBarPercent = (
    evalScore: number | string | null,
    scale: number = 4,
    evalTurn: "w" | "b" = turn
  ): number => {
    if (evalScore === null) return 50;

    if (typeof evalScore === "string" && evalScore.includes("M")) {
      if (evalScore === "M0") return 50;
      if (evalScore.includes("-")) return evalTurn === "w" ? 0 : 100;
      return evalTurn === "w" ? 100 : 0;
    }

    let numericScore =
      typeof evalScore === "string" ? parseFloat(evalScore) : evalScore;

    if (evalTurn === "b") {
      numericScore = -numericScore;
    }

    const normalized = Math.atan(numericScore / scale) / Math.PI + 0.5;

    return normalized * 100;
  };

  const formatScore = (
    score: number | string | null,
    advantage: "w" | "b"
  ): string => {
    if (score === null) return "???";
    if (typeof score === "string" && score.includes("M")) {
      return score.replace(/-/g, "");
    }
    const numericScore =
      typeof score === "string" ? parseFloat(score) : score ?? 0;
    return advantage === "w"
      ? Math.abs(numericScore).toString()
      : (-Math.abs(numericScore)).toString();
  };

  // Calculate current percentage based on evalchange progress or final score
  const getCurrentPercent = (): number => {
    if (!evalchange) {
      return evalToBarPercent(score);
    }

    // Infer previous turn: if current turn is "w", previous was "b", and vice versa
    const previousTurn: "w" | "b" = turn === "w" ? "b" : "w";

    const previousPercent = evalToBarPercent(evalchange.previousEval, 4, previousTurn);
    const currentPercent = evalToBarPercent(score, 4, turn);
    
    // Interpolate between previous and current based on progress
    return previousPercent + (currentPercent - previousPercent) * evalchange.progress;
  };

  const whitePercent = getCurrentPercent();

  const transitionClass = disableAnimation
    ? ""
    : "transition-all duration-300 ease-in-out";

  return (
    <div className="flex flex-1 h-full relative overflow-hidden">
      <div
        className={`bg-zinc-200 absolute bottom-0 left-0 right-0 flex flex-col-reverse ${transitionClass}`}
        style={{ height: `${whitePercent}%` }}
      >
        {whitePercent >= 50 && (
          <span
        className="text-center"
        style={{ fontSize: textSize ?? "1vw" }}
          >
        {formatScore(score, "w")}
          </span>
        )}
      </div>

      <div
        className={`bg-black absolute top-0 left-0 right-0 text-center flex flex-col ${transitionClass}`}
        style={{ height: `${100 - whitePercent}%` }}
      >
        {whitePercent < 50 && (
          <span
        className="text-white text-center"
        style={{ fontSize: textSize ?? "1vw" }}
          >
        {formatScore(score, "b")}
          </span>
        )}
      </div>

      {/* Center line */}
      <div
        className="absolute left-0 right-0 border-t border-amber-500"
        style={{ top: "50%" }}
      />
    </div>
  );
}

export default EvalBar;