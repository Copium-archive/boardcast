import React from 'react';
import {Composition} from 'remotion';
import {MyComponent} from './MyComponent';
 
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Empty"
        component={MyComponent}
        durationInFrames={90}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};