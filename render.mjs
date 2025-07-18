import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import path from "path";

const compositionId = "Chess"; // 👈 Make sure this is the ID of your composition in remotion/index.ts
const outputLocation = `out/${compositionId}.mp4`;

const start = async () => {
  try {
    console.log("Creating a Webpack bundle of the Remotion video...");
    const entry = "./remotion/index.ts"; 
    
    const bundleLocation = await bundle({
      entryPoint: path.resolve(entry),
      webpackOverride: (config) => config,
    });

    console.log("Getting video compositions...");

    const comps = await getCompositions(bundleLocation);

    const composition = comps.find((c) => c.id === compositionId);

    if (!composition) {
      throw new Error(`No composition with the ID ${compositionId} found.`);
    }

    console.log("Rendering video...");

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation
    });

    console.log(`✅ Render finished! Output file is at: ${outputLocation}`);
  } catch (err) {
    console.error("❌ Error rendering video:", err);
    process.exit(1);
  }
};

start();