import 'dotenv/config';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ingest } from './ingest';
import { analyze } from './analyze';
import { edit } from './editor';
import { narrate } from './voice';
import { render } from './render';
import { planTimeline, validateTimeline } from './timeline';
import { addInserts } from './inserts';
import { candidateMemory, commitMemory, loadMemory, memoryDelta, retrieve } from './memory';
import { fileHash, hash, json, save } from './io';
import { assert, validateAnalysis, validateDraft, type Production, type Source, type AudioBeat } from './schema';

const {values,positionals}=parseArgs({args:Bun.argv.slice(2),allowPositionals:true,options:{
  inserts:{type:'string'},video:{type:'string'},episode:{type:'string'},'work-dir':{type:'string'},evidence:{type:'string'},subtitles:{type:'string'},memory:{type:'string'},draft:{type:'string'},
  seconds:{type:'string',default:'300'},voice:{type:'string',default:'chatterbox-turbo'},'video-model':{type:'string'},help:{type:'boolean'},
}});
const command=positionals[0] || 'all';
if(values.help) { console.log(`bun run src/recap/cli.ts <ingest|analyze|plan|narrate|render|all|commit-memory> --work-dir media/recaps/example
  First run: --video file-or-url --episode episode.json
  Analysis: --evidence verified-analysis.json OR GOOGLE_API_KEY [--subtitles episode.srt] [--video-model model]
  Writing: [--memory show-memory.json] [--draft edited-draft.json] [--seconds 300]
  Voice: [--voice chatterbox-turbo]
  commit-memory explicitly applies the saved candidate delta to --memory using revision checks.
  Each stage saves inspectable outputs; rerun a stage after changing its inputs. No video publishing.`); process.exit(0); }
try {
  assert(['ingest','analyze','plan','narrate','render','all','commit-memory'].includes(command),'Unknown recap command');
  assert(values['work-dir'],'--work-dir is required'); const directory=path.resolve(values['work-dir']);
  if(command==='commit-memory') {
    assert(values.memory,'--memory destination is required'); const delta=await json(path.join(directory,'memory-delta.json'));
    const source=await json<Source>(path.join(directory,'source.json')); const analysis=await json(path.join(directory,'analysis.json')); validateAnalysis(analysis,source);
    const current=await loadMemory(values.memory,source.episode.showId); const expected=memoryDelta(analysis,current);
    assert(delta.showId===source.episode.showId && JSON.stringify(delta.episode)===JSON.stringify(source.episode) && delta.sourceHash===expected.sourceHash && JSON.stringify(delta.facts)===JSON.stringify(expected.facts),'Candidate delta differs from validated episode evidence');
    const result=await commitMemory(values.memory,delta); console.log(`[Recap] Show memory revision ${result.revision}`);
  } else {
    let source: Source;
    if(command==='ingest' || command==='all') { assert(values.video && values.episode,'--video and --episode are required'); source=await ingest(values.video,await json(values.episode),directory); }
    else source=await json<Source>(path.join(directory,'source.json'));
    assert(await fileHash(source.video)===source.sourceHash,'Source video changed; rerun ingest');
    if(command==='ingest') console.log(`[Recap] Indexed ${source.duration.toFixed(1)} seconds`);
    else {
      const analysis=command==='analyze' || command==='all' ? await analyze(source,directory,{evidence:values.evidence,subtitles:values.subtitles,model:values['video-model']}) : await json(path.join(directory,'analysis.json'));
      validateAnalysis(analysis,source);
      if(command==='analyze') console.log(`[Recap] ${analysis.events.length} events, ${analysis.evidence.length} evidence ranges`);
      else {
        const memory=await loadMemory(values.memory,source.episode.showId);
        const context=retrieve(memory,source.episode,[...new Set(analysis.evidence.flatMap(e=>e.entities))]);
        await save(path.join(directory,'context-packet.json'),{memoryRevision:memory.revision,episode:source.episode,facts:context});
        const production: Production=command==='plan' || command==='all' ? await edit(analysis,context,directory,Number(values.seconds),{draft:values.draft}) : await json(path.join(directory,'production.json'));
        assert(production.sourceHash===source.sourceHash && production.approvalHash===hash({draft:production.draft,analysis:production.analysis,context:production.context}) && production.review.approved && production.review.issues.length===0,'Reviewed production for this source is required');
        assert(JSON.stringify(production.analysis)===JSON.stringify(analysis) && JSON.stringify(production.context)===JSON.stringify(context),'Evidence or memory changed; rerun plan before narration/rendering');
        validateDraft(production.draft,analysis,context,production.targetSeconds);
        const delta=memoryDelta(analysis,memory); await save(path.join(directory,'memory-delta.json'),delta); await save(path.join(directory,'candidate-memory.json'),candidateMemory(memory,delta));
        if(command==='plan') console.log('[Recap] Saved reviewed production and candidate show-memory delta');
        else {
          const audio: AudioBeat[]=command==='narrate' || command==='all' ? await narrate(production,directory,values.voice) : (await json(path.join(directory,'audio.json'))).beats;
          let timeline=planTimeline(source,production,audio); if(values.inserts) timeline=await addInserts(timeline,source,production,await json(values.inserts),directory); validateTimeline(timeline,source); await save(path.join(directory,'timeline.json'),timeline);
          console.log(`[Recap] Measured runtime ${timeline.duration.toFixed(1)}s, target ${production.targetSeconds}s`);
          if(Math.abs(timeline.duration-production.targetSeconds)>production.targetSeconds*.2) console.warn('[Recap] Runtime differs from target by more than 20%; review pacing before publishing');
          if(command==='render' || command==='all') console.log(await render(timeline,directory));
        }
      }
    }
  }
} catch(error) { console.error(`[Recap] ${error instanceof Error ? error.message : error}`); process.exitCode=1; }
