/**
 * Module-level cache for Reader shard fetches. Each book's text and refs shard
 * is fetched at most once per session; the Promise itself is cached so
 * concurrent requesters share the in-flight fetch.
 */
const textCache = new Map();
const refsCache = new Map();

function fetchJson(url) {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.json();
  });
}

export function loadBookText(abbrev) {
  if (!textCache.has(abbrev)) {
    textCache.set(abbrev, fetchJson(`/data/text/${abbrev}.json`).catch((err) => {
      textCache.delete(abbrev);
      throw err;
    }));
  }
  return textCache.get(abbrev);
}

/**
 * TSK pairs exist in both directions, so a verse's ref list can name the same
 * target twice (once per direction). Keep only the first (strongest — shards
 * are pre-sorted tier asc, votes desc) entry per target ref.
 */
function dedupeRefs(shard) {
  for (const key of Object.keys(shard)) {
    const seen = new Set();
    shard[key] = shard[key].filter(([target]) => {
      if (seen.has(target)) return false;
      seen.add(target);
      return true;
    });
  }
  return shard;
}

export function loadBookRefs(abbrev) {
  if (!refsCache.has(abbrev)) {
    refsCache.set(abbrev, fetchJson(`/data/refs/${abbrev}.json`).then(dedupeRefs).catch((err) => {
      refsCache.delete(abbrev);
      throw err;
    }));
  }
  return refsCache.get(abbrev);
}
