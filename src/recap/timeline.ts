import { hash } from './io';
import { assert, VERSION, type AudioBeat, type Production, type Segment, type Source, type Timeline } from './schema';
// Take unused portions of evidence ranges. Never loop, freeze, or silently speed up source footage.
export function planTimeline(source: Source, production: Production, audio: AudioBeat[]): Timeline {
  assert(production.sourceHash===source.sourceHash && production.review.approved && production.review.issues.length===0 && production.approvalHash===hash({draft:production.draft,analysis:production.analysis,context:production.context}),'Timeline requires reviewed production for this exact source');
  assert(audio.length===production.draft.beats.length,'Audio does not match production');
  const segments: Segment[]=[]; const used: Array<[number,number]>=[]; let cursor=0;
  for(let index=0;index<audio.length;index++) {
    const beat=production.draft.beats[index]!, recording=audio[index]!;
    assert(recording.id===beat.id && recording.text===beat.text && Number.isFinite(recording.duration) && recording.duration>0,'Audio beat mismatch');
    let remaining=recording.duration;
    const evidence=beat.evidenceIds.map(id=>production.analysis.evidence.find(e=>e.id===id)!);
    for(const e of evidence) {
      assert(e,'Missing footage evidence'); let ranges: Array<[number,number]>=[[e.start,Math.min(e.end,source.duration)]];
      for(const [u,v] of used) ranges=ranges.flatMap(([s,t])=>v<=s || u>=t ? [[s,t] as [number,number]] : [[s,Math.min(t,u)],[Math.max(s,v),t]].filter(([a,b])=>b!>a!) as Array<[number,number]>);
      for(const [start,end] of ranges) {
        if(remaining<=.001) break; const duration=Math.min(end-start,remaining,8);
        if(duration<.08) continue;
        segments.push({beatId:beat.id,outputStart:cursor,outputEnd:cursor+duration,sourceStart:start,sourceEnd:start+duration,evidenceId:e.id});
        used.push([start,start+duration]); cursor+=duration; remaining-=duration;
        // Continue through the rest of a long evidence range using distinct consecutive shots.
        let next=start+duration;
        while(remaining>.001 && next<end-.08) { const d=Math.min(end-next,remaining,8); segments.push({beatId:beat.id,outputStart:cursor,outputEnd:cursor+d,sourceStart:next,sourceEnd:next+d,evidenceId:e.id}); used.push([next,next+d]); cursor+=d;remaining-=d;next+=d; }
      }
    }
    assert(remaining<=.04,`Beat ${beat.id} needs ${remaining.toFixed(1)}s more distinct supporting footage. Shorten narration or select additional evidence; footage will not loop.`);
  }
  const result: Timeline={version:VERSION,sourceHash:source.sourceHash,video:source.video,title:production.draft.title,duration:cursor,beats:audio,segments};
  validateTimeline(result,source); return result;
}
export function validateTimeline(t: Timeline,source: Source) {
  assert(t.version===VERSION && t.sourceHash===source.sourceHash && t.video===source.video && t.segments.length>0,'Timeline source mismatch');
  let cursor=0;
  for(const s of t.segments) { assert([s.outputStart,s.outputEnd,s.sourceStart,s.sourceEnd].every(Number.isFinite) && Math.abs(s.outputStart-cursor)<.04 && s.outputEnd>s.outputStart && s.sourceStart>=0 && s.sourceEnd<=source.duration+.04 && Math.abs(s.outputEnd-s.outputStart-(s.sourceEnd-s.sourceStart))<.04,'Invalid timeline range or gap'); cursor=s.outputEnd; }
  assert(Math.abs(cursor-t.duration)<.04 && Math.abs(t.beats.reduce((n,b)=>n+b.duration,0)-t.duration)<.1,'Timeline duration differs from audio');
}
