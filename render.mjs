// render.mjs
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia} from '@remotion/renderer';
import path from 'node:path';

const ENTRY = path.resolve('./remotion/index.ts');              // your Remotion entry
const COMPOSITION_ID = 'Chess';                                 // your composition id
const OUTPUT = path.resolve('./sample_exporting/chess-animation.mp4'); // output file

const bundleLocation = await bundle({entryPoint: ENTRY});
const composition = await selectComposition({serveUrl: bundleLocation, id: COMPOSITION_ID});

await renderMedia({
  serveUrl: bundleLocation,
  composition,
  codec: 'h264',
  outputLocation: OUTPUT,
});

console.log('✅ Render done:', OUTPUT);
