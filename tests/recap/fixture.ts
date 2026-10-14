/** Synthetic source and known evidence for repeatable media and live-model checks. */
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { ingest } from '../../src/recap/ingest';
import { hash,json,probe,run,save } from '../../src/recap/io';
import { VERSION,type Analysis,type Production,type AudioBeat } from '../../src/recap/schema';
import { planTimeline } from '../../src/recap/timeline';
import { render } from '../../src/recap/render';
import { addInserts } from '../../src/recap/inserts';
const directory=path.resolve(Bun.argv[2] || 'media/recap-fixture');
await mkdir(directory,{recursive:true});
const ffmpeg=process.env.FFMPEG_BIN || 'ffmpeg';
async function speech(text:string,file:string) {
  if(Bun.which('espeak-ng')) await run('espeak-ng',['-s','150','-w',file,text]);
  else { const aiff=file+'.aiff'; await run('say',['-r','150','-o',aiff,text]); await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',aiff,file]); }
}
const sourceLines=['The signal is red. The door is closed.','The signal turns green. The door opens.'];
for(let i=0;i<2;i++) {
  await speech(sourceLines[i]!,path.join(directory,`source${i}.wav`));
  const color=i===0?'red':'green';
  await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','lavfi','-i',`color=c=0x151515:s=640x360:r=30`,'-i',path.join(directory,`source${i}.wav`),'-t','24','-vf',`drawbox=x=70:y=100:w=80:h=80:color=${color}:t=fill,drawbox=x=350:y=50:w=${i===0?140:25}:h=260:color=white:t=fill`,'-af','apad','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-ar','48000',path.join(directory,`scene${i}.mp4`)]);
}
await Bun.write(path.join(directory,'concat.txt'),"file 'scene0.mp4'\nfile 'scene1.mp4'\n");
await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','concat','-safe','1','-i',path.join(directory,'concat.txt'),'-c','copy',path.join(directory,'episode.mp4')]);
const episode={showId:'signal-test',id:'ep1',order:1,continuity:'main',title:'The signal and the door'};
await save(path.join(directory,'episode.json'),episode);
const source=await ingest(path.join(directory,'episode.mp4'),episode,directory);
const analysis:Analysis={version:VERSION,episode,sourceHash:source.sourceHash,duration:source.duration,evidence:[
{id:'red',start:0,end:24,observation:'A red square is visible beside a broad white rectangle representing a closed door. The voice says the signal is red and the door is closed.',kind:'observed',entities:['signal','door'],confidence:1},
{id:'green',start:24,end:48,observation:'The square becomes green and the white rectangle becomes narrow, representing an open door. The voice says the signal turns green and the door opens.',kind:'observed',entities:['signal','door'],confidence:1}],events:[
{id:'closed',evidenceIds:['red'],description:'Red signal and closed door',requires:[],essential:true},
{id:'opened',evidenceIds:['green'],description:'Green signal and open door',requires:['closed'],essential:true}],warnings:['Synthetic media fixture, not an actual television episode.']};
await save(path.join(directory,'evidence.json'),analysis);await save(path.join(directory,'analysis.json'),analysis);
const draft={title:'The signal changes',beats:[
{id:'b1',text:'The sequence begins with a red signal beside a closed door. A voice confirms that the door is still closed.',direction:'calm observation',pauseAfterMs:150,eventIds:['closed'],evidenceIds:['red'],memoryIds:[]},
{id:'b2',text:'Then the signal turns green and the door opens. The sequence ends with the green signal and the open door.',direction:'clear resolution',pauseAfterMs:150,eventIds:['opened'],evidenceIds:['green'],memoryIds:[]}],omittedEventIds:[]};
await save(path.join(directory,'draft-fixture.json'),draft);
await save(path.join(directory,'inserts-fixture.json'),[{id:'original1',afterBeatId:'b1',evidenceId:'red',start:0,end:Number((await probe(path.join(directory,'source0.wav'))).format.duration),transcript:sourceLines[0],purpose:'Demonstrate isolated original dialogue between narration beats'}]);
if(Bun.argv.includes('--render')) {
  const production:Production={version:VERSION,fingerprint:'synthetic-fixture',approvalHash:hash({draft,analysis,context:[]}),sourceHash:source.sourceHash,episode,analysis,context:[],draft,review:{approved:true,issues:[]},model:'verified-fixture-no-ai-review',targetSeconds:20};
  await save(path.join(directory,'production.json'),production);
  const audio:AudioBeat[]=[];
  for(const b of draft.beats) { const file=path.join(directory,`${b.id}.wav`); await speech(b.text,file); audio.push({id:b.id,text:b.text,file,duration:Number((await probe(file)).format.duration)}); }
  const base=planTimeline(source,production,audio);
  const timeline=await addInserts(base,source,production,await json(path.join(directory,'inserts-fixture.json')),directory);
  await save(path.join(directory,'audio.json'),{beats:audio});
  await render(timeline,directory);
}
console.log(`[Fixture] Prepared ${directory}`);
