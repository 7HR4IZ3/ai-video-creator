import path from 'node:path';
import { fileHash, hash, json, run, save } from './io';
import { assert } from './schema';
import type { Timeline } from './schema';
export async function render(timeline: Timeline,directory: string) {
  assert(await fileHash(timeline.video)===timeline.sourceHash,'Source footage changed after analysis');
  const output=path.resolve(directory,'recap.mp4'), timelineFile=path.resolve(directory,'timeline.json');
  await save(timelineFile,timeline);
  const audioHashes=await Promise.all(timeline.beats.map(b=>fileHash(b.file)));
  const workerHash=await fileHash(path.resolve(import.meta.dir,'../../utils/recap_render.py'));
  const captionHelperHash=await fileHash(path.resolve(import.meta.dir,'../../utils/story_render.py'));
  const fingerprint=hash({version:'recap-render-v1',timeline,audioHashes,workerHash,captionHelperHash});
  try { const cached=await json(`${output}.manifest.json`); if(cached.fingerprint===fingerprint && cached.outputHash===await fileHash(output)) return output; } catch {}
  console.log(await run(process.env.RENDER_PYTHON || 'python3',[path.resolve(import.meta.dir,'../../utils/recap_render.py'),'--timeline',timelineFile,'--output',output],3_600_000));
  await save(`${output}.manifest.json`,{fingerprint,outputHash:await fileHash(output)}); return output;
}
