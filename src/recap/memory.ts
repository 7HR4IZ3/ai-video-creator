import { mkdir, rm } from 'node:fs/promises';
import { assert, safeId, strings, VERSION, type Analysis, type Episode, type Memory, type MemoryFact } from './schema';
import { hash, json, save } from './io';
export function validateMemory(m: any, showId: string): asserts m is Memory {
  assert(m?.version === VERSION && m.showId === showId && Array.isArray(m.facts) && typeof m.revision === 'string', 'Invalid show memory');
  const ids = new Set<string>();
  const episodeOrders = new Map<string, number>(), occupiedOrders = new Map<string,string>();
  for (const f of m.facts) {
    assert(Object.keys(f).every(key=>['id','episodeId','revealOrder','continuity','statement','entities','evidenceIds','kind','supersedes'].includes(key)), 'Unknown fields in memory fact; do not attach unscoped future context');
    const episodeKey=`${f.continuity}:${f.episodeId}`, orderKey=`${f.continuity}:${f.revealOrder}`;
    assert(!episodeOrders.has(episodeKey) || episodeOrders.get(episodeKey)===f.revealOrder,'Episode has inconsistent reveal order');
    assert(!occupiedOrders.has(orderKey) || occupiedOrders.get(orderKey)===f.episodeId,'Two episodes share the same continuity order');
    episodeOrders.set(episodeKey,f.revealOrder); occupiedOrders.set(orderKey,f.episodeId);
    assert(safeId(f.id) && !ids.has(f.id) && safeId(f.episodeId) && safeId(f.continuity) && Number.isInteger(f.revealOrder) && f.revealOrder >= 0 && typeof f.statement === 'string' && f.statement.trim() && strings(f.entities) && strings(f.evidenceIds) && f.evidenceIds.length && ['observed','claimed','inferred'].includes(f.kind), 'Invalid or duplicate memory fact'); ids.add(f.id);
  }
  for (const f of m.facts) if (f.supersedes) {
    const prior = m.facts.find((p: MemoryFact) => p.id === f.supersedes);
    assert(prior && prior.continuity === f.continuity && prior.revealOrder < f.revealOrder && prior.id !== f.id, 'Invalid memory correction');
  }
  assert(m.revision === hash(m.facts), 'Memory revision does not match records');
}
export function emptyMemory(showId: string): Memory { return { version: VERSION, showId, revision: hash([]), facts: [] }; }
export async function loadMemory(file: string | undefined, showId: string) {
  if (!file) return emptyMemory(showId);
  let m; try { m = await json(file); } catch (e: any) { if (e.code === 'ENOENT') return emptyMemory(showId); throw e; }
  validateMemory(m, showId); return m;
}
export function retrieve(m: Memory, episode: Episode, entities: string[], maxChars = 14_000): MemoryFact[] {
  validateMemory(m, episode.showId);
  // Filter BEFORE scoring or collecting superseding IDs. Future corrections must not erase old knowledge.
  const eligible = m.facts.filter(f => f.continuity === episode.continuity && f.revealOrder < episode.order && f.episodeId !== episode.id);
  const superseded = new Set(eligible.map(f => f.supersedes).filter(Boolean));
  const wanted = new Set(entities.map(e => e.toLowerCase()));
  const ranked = eligible.filter(f => !superseded.has(f.id) && f.entities.some(e => wanted.has(e.toLowerCase())))
    .sort((a,b) => b.revealOrder - a.revealOrder || a.id.localeCompare(b.id));
  const selected: MemoryFact[] = []; let size = 0;
  for (const f of ranked) { const length = JSON.stringify(f).length; if (size + length <= maxChars) { selected.push(f); size += length; } }
  return selected.sort((a,b) => a.revealOrder - b.revealOrder || a.id.localeCompare(b.id));
}
export function memoryDelta(a: Analysis, m: Memory) {
  // Candidate observations retain the original epistemic status; they are not automatically accepted canon.
  const facts: MemoryFact[] = a.evidence.filter(e => e.confidence >= .8 && e.kind !== 'inferred').map(e => ({
    id: `f_${hash([a.sourceHash,e.id]).slice(0,24)}`, episodeId: a.episode.id, revealOrder: a.episode.order,
    continuity: a.episode.continuity, statement: e.observation, entities: e.entities, evidenceIds: [`${a.sourceHash}:${e.id}`], kind: e.kind,
  }));
  return { version: VERSION, showId: m.showId, parentRevision: m.revision, sourceHash: a.sourceHash, episode: a.episode, facts };
}
export function candidateMemory(current: Memory, delta: ReturnType<typeof memoryDelta>): Memory {
  assert(current.showId===delta.showId && current.revision===delta.parentRevision, "Memory candidate parent mismatch");
  const known = new Map(current.facts.map(f => [f.id,f]));
  for (const f of delta.facts) { assert(!known.has(f.id) || JSON.stringify(known.get(f.id)) === JSON.stringify(f), 'Conflicting immutable memory record'); known.set(f.id, f); }
  const facts = [...known.values()].sort((a,b) => a.revealOrder - b.revealOrder || a.id.localeCompare(b.id));
  const next: Memory = { version: VERSION, showId: current.showId, facts, revision: hash(facts) }; validateMemory(next, next.showId);
  return next;
}
export async function commitMemory(file: string, delta: ReturnType<typeof memoryDelta>) {
  await mkdir((await import('node:path')).dirname(file), { recursive: true });
  const lock = `${file}.lock`; await mkdir(lock).catch(() => { throw new Error('Show memory is locked by another writer; retry after it finishes'); });
  try {
    const current = await loadMemory(file, delta.showId);
    assert(current.revision === delta.parentRevision, 'Stale memory update; regenerate against the latest memory revision');
    const next=candidateMemory(current,delta);
    await save(file, next); return next;
  } finally { await rm(lock, { recursive: true }); }
}
