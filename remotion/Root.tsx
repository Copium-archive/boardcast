import React from 'react';
import {Composition} from 'remotion';
import {ChessComponent} from './ChessComponent';
import './style.css';
import data from './export.json'
 
export const RemotionRoot: React.FC = () => {
  const framePerMove = data.framePerMove;
  const timePerMove = data.timePerMove;

  return (
    <>
      <Composition
      id="Chess"
      component={ChessComponent}
      durationInFrames={data.positions.length * framePerMove}
      fps={Math.round(framePerMove / timePerMove)}
      width={Math.round(data.boardSize * 9/8) || 1280} // Ensure integer width
      height={Math.round(data.boardSize) || 720} // Ensure integer height
      />
    </>
  );
};