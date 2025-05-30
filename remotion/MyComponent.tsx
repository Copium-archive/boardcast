import {AbsoluteFill} from 'remotion';

const Title: React.FC<{title: string}> = ({title}) => {
  return (
    <div style={{
      textAlign: 'center',
      fontSize: '7em',
      color: 'white', // Ensure text is visible
      lineHeight: '720px', // Vertically center for 720p
    }}>
      {title}
    </div>
  );
};

export const MyComponent = () => {
  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}> {/* Set background */}
      <Title title="Hello World" />
    </AbsoluteFill>
  );
};