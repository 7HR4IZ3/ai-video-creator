export const VERSION = 'episode-recap-v1';
export interface Episode { showId: string; id: string; order: number; continuity: string; title: string }
export interface Evidence { id: string; start: number; end: number; observation: string; kind: 'observed' | 'claimed' | 'inferred'; entities: string[]; confidence: number }
export interface Event { id: string; evidenceIds: string[]; description: string; requires: string[]; essential: boolean }
export interface Analysis { version: string; sourceHash: string; episode: Episode; duration: number; evidence: Evidence[]; events: Event[]; warnings: string[] }
export interface MemoryFact { id: string; episodeId: string; revealOrder: number; continuity: string; statement: string; entities: string[]; evidenceIds: string[]; kind: Evidence['kind']; supersedes?: string }
export interface Memory { version: string; showId: string; revision: string; facts: MemoryFact[] }
export interface Beat { id: string; text: string; direction: string; pauseAfterMs: number; eventIds: string[]; evidenceIds: string[]; memoryIds: string[] }
export interface Draft { title: string; beats: Beat[]; omittedEventIds: string[] }
export interface Production { version: string; fingerprint: string; approvalHash: string; sourceHash: string; episode: Episode; analysis: Analysis; context: MemoryFact[]; draft: Draft; review: { approved: boolean; issues: string[] }; model: string; targetSeconds: number }
export interface Source { version: string; episode: Episode; sourceHash: string; video: string; duration: number }
export interface Segment { beatId: string; outputStart: number; outputEnd: number; sourceStart: number; sourceEnd: number; evidenceId: string }
export interface AudioBeat { id: string; file: string; duration: number; text: string }
export interface Timeline { version: string; sourceHash: string; video: string; title: string; duration: number; beats: AudioBeat[]; segments: Segment[] }
export function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
export function safeId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value); }
export function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(x => typeof x === 'string' && x.length > 0); }
export function episode(value: any): asserts value is Episode {
  assert(value && safeId(value.showId) && safeId(value.id) && safeId(value.continuity), 'Episode requires safe showId, id, continuity');
  assert(Number.isInteger(value.order) && value.order >= 0 && typeof value.title === 'string' && value.title.trim(), 'Episode requires nonnegative integer order and title');
}
export function validateAnalysis(a: any, source: Source): asserts a is Analysis {
  assert(a?.version === VERSION && a.sourceHash === source.sourceHash && JSON.stringify(a.episode) === JSON.stringify(source.episode), 'Analysis belongs to a different source or episode');
  assert(Number.isFinite(a.duration) && Math.abs(a.duration - source.duration) < .3, 'Analysis duration differs from source');
  assert(Array.isArray(a.evidence) && a.evidence.length > 0 && Array.isArray(a.events) && a.events.length > 0 && strings(a.warnings), 'Analysis needs evidence, events, warnings');
  const ids = new Set<string>();
  for (const e of a.evidence) {
    assert(safeId(e.id) && !ids.has(e.id), 'Duplicate or invalid evidence ID'); ids.add(e.id);
    assert(Number.isFinite(e.start) && Number.isFinite(e.end) && e.start >= 0 && e.end > e.start && e.end <= source.duration + .05, 'Evidence range outside source');
    assert(typeof e.observation === 'string' && e.observation.trim() && strings(e.entities) && ['observed','claimed','inferred'].includes(e.kind) && Number.isFinite(e.confidence) && e.confidence >= 0 && e.confidence <= 1, 'Invalid evidence fields');
  }
  const events = new Set<string>();
  for (const e of a.events) {
    assert(safeId(e.id) && !events.has(e.id), 'Duplicate or invalid event ID'); events.add(e.id);
    assert(typeof e.description === 'string' && e.description.trim() && typeof e.essential === 'boolean' && strings(e.requires) && strings(e.evidenceIds) && e.evidenceIds.length > 0 && e.evidenceIds.every((id: string) => ids.has(id)), 'Invalid event evidence');
  }
  const visited = new Set<string>(), active = new Set<string>();
  function visit(id: string) { assert(!active.has(id), 'Cyclic event dependency'); if (visited.has(id)) return; active.add(id); const e = a.events.find((x: Event) => x.id === id); assert(e, 'Unknown event dependency'); for (const parent of e.requires) visit(parent); active.delete(id); visited.add(id); }
  for (const id of events) visit(id);
}
export function validateDraft(d: any, a: Analysis, context: MemoryFact[], seconds: number): asserts d is Draft {
  assert(typeof d?.title === 'string' && d.title.trim() && Array.isArray(d.beats) && d.beats.length >= 2 && d.beats.length <= 60 && strings(d.omittedEventIds), 'Invalid recap draft');
  const ids = new Set<string>(), covered = new Set<string>(), memory = new Set(context.map(x => x.id));
  let previous = -1;
  for (const b of d.beats) {
    assert(safeId(b.id) && !ids.has(b.id), 'Duplicate or invalid beat ID'); ids.add(b.id);
    assert(typeof b.text === 'string' && b.text.trim() && !/[\[\]{}]/.test(b.text) && typeof b.direction === 'string' && b.direction.trim() && Number.isInteger(b.pauseAfterMs) && b.pauseAfterMs >= 0 && b.pauseAfterMs <= 1000, 'Invalid spoken beat');
    assert(strings(b.eventIds) && b.eventIds.length && strings(b.evidenceIds) && b.evidenceIds.length && strings(b.memoryIds) && b.memoryIds.every((id: string) => memory.has(id)), 'Beat has missing evidence or ineligible memory');
    const allowed = new Set<string>();
    for (const id of b.eventIds) {
      const event = a.events.find(e => e.id === id); assert(event, 'Beat cites unknown event');
      for (const dependency of event.requires) assert(covered.has(dependency) || b.eventIds.indexOf(dependency) < b.eventIds.indexOf(id) && b.eventIds.includes(dependency), 'Narration omits a causal prerequisite');
      event.evidenceIds.forEach(x => allowed.add(x)); covered.add(id);
    }
    assert(b.evidenceIds.every((id: string) => allowed.has(id)), 'Visual evidence is unrelated to cited events');
    const first = Math.min(...b.evidenceIds.map((id: string) => a.evidence.find(e => e.id === id)!.start));
    assert(first >= previous, 'Beat reveal order goes backwards'); previous = first;
  }
  for (const event of a.events) assert(covered.has(event.id) || !event.essential && d.omittedEventIds.includes(event.id), 'Missing essential event or unrecorded omission');
  assert(d.omittedEventIds.every((id: string) => a.events.some(e => e.id === id) && !covered.has(id)), 'Invalid omitted event');
  const words = d.beats.map((b: Beat) => b.text).join(' ').trim().split(/\s+/).length;
  assert(words >= seconds * 1.7 && words <= seconds * 3, `Narration has ${words} words; expected ${Math.ceil(seconds * 1.7)}–${Math.floor(seconds * 3)}`);
}

const stringArray = {type:'array',items:{type:'string'}};
export const ANALYSIS_OUTPUT_SCHEMA = {
 type:'object',required:['evidence','events','warnings'],properties:{
  evidence:{type:'array',minItems:1,items:{type:'object',required:['id','start','end','observation','kind','entities','confidence'],properties:{
   id:{type:'string'},start:{type:'number',minimum:0},end:{type:'number',minimum:0},observation:{type:'string'},
   kind:{type:'string',enum:['observed','claimed','inferred']},entities:stringArray,confidence:{type:'number',minimum:0,maximum:1}
  }}},
  events:{type:'array',minItems:1,items:{type:'object',required:['id','evidenceIds','description','requires','essential'],properties:{
   id:{type:'string'},evidenceIds:stringArray,description:{type:'string'},requires:stringArray,essential:{type:'boolean'}
  }}},warnings:stringArray
 }
};
