import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'path';
 
const compositionId = 'Chess';
const bundleLocation = await bundle({
  entryPoint: path.resolve('./remotion/index.ts'),
  webpackOverride: (config) => config,
});
 
const inputProps = {};
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: compositionId,
  inputProps,
});
 
await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: 'h264',
  outputLocation: `out/${compositionId}.mp4`,
  inputProps,
});
 
console.log('Render done!');