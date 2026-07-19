/**
 * Matrix aggregation for the zoomable cross-reference heatmap.
 *
 * References are the store's normalized records:
 *   { from, to, tier, votes, fromBook, toBook }
 * where `from`/`to` are global chapter indices (0-based) and
 * `fromBook`/`toBook` are 1-based book numbers (1..66).
 *
 * All aggregation is directional (book i -> book j) and done in a single
 * pass into flat typed arrays, so it stays cheap even at ~345k records.
 * Tier 6 is used as the "no tier" sentinel (lower tier number = stronger).
 */

const N_BOOKS = 66;
const NO_TIER = 6;

/**
 * Build the 66x66 book-level matrix, honoring the active tier filter.
 * counts[i*66 + j] = number of refs FROM book (i+1) TO book (j+1).
 * topTier[i*66 + j] = strongest (lowest) tier present in that cell, or 6.
 */
export function buildBookMatrix(references, tierVisibility) {
  const counts = new Int32Array(N_BOOKS * N_BOOKS);
  const topTier = new Int8Array(N_BOOKS * N_BOOKS).fill(NO_TIER);

  if (!references) {
    return { counts, topTier, maxOffDiag: 0, maxAll: 0 };
  }

  for (let k = 0; k < references.length; k++) {
    const ref = references[k];
    if (!tierVisibility[ref.tier]) continue;
    const i = ref.fromBook - 1;
    const j = ref.toBook - 1;
    if (i < 0 || i >= N_BOOKS || j < 0 || j >= N_BOOKS) continue;
    const idx = i * N_BOOKS + j;
    counts[idx]++;
    if (ref.tier < topTier[idx]) topTier[idx] = ref.tier;
  }

  let maxOffDiag = 0;
  let maxAll = 0;
  for (let i = 0; i < N_BOOKS; i++) {
    for (let j = 0; j < N_BOOKS; j++) {
      const c = counts[i * N_BOOKS + j];
      if (c > maxAll) maxAll = c;
      if (i !== j && c > maxOffDiag) maxOffDiag = c;
    }
  }

  return { counts, topTier, maxOffDiag, maxAll };
}

/**
 * Build a chapter x chapter matrix for one ordered book pair (bookI -> bookJ).
 * bookI / bookJ are 0-based book indices. Uses each book's chapterOffset from
 * metadata to map global chapter indices to local (0-based) chapter numbers.
 * counts[ci*nCols + cj] = refs from chapter ci of book I to chapter cj of book J.
 */
export function buildChapterMatrix(references, tierVisibility, bookI, bookJ, metadata) {
  const bookINum = bookI + 1;
  const bookJNum = bookJ + 1;
  const metaI = metadata.books[bookI];
  const metaJ = metadata.books[bookJ];
  const nRows = metaI.chapters;
  const nCols = metaJ.chapters;
  const offI = metaI.chapterOffset;
  const offJ = metaJ.chapterOffset;

  const counts = new Int32Array(nRows * nCols);
  const topTier = new Int8Array(nRows * nCols).fill(NO_TIER);
  const sameBook = bookI === bookJ;

  for (let k = 0; k < references.length; k++) {
    const ref = references[k];
    if (ref.fromBook !== bookINum || ref.toBook !== bookJNum) continue;
    if (!tierVisibility[ref.tier]) continue;
    const ci = ref.from - offI;
    const cj = ref.to - offJ;
    if (ci < 0 || ci >= nRows || cj < 0 || cj >= nCols) continue;
    const idx = ci * nCols + cj;
    counts[idx]++;
    if (ref.tier < topTier[idx]) topTier[idx] = ref.tier;
  }

  let maxOffDiag = 0;
  let maxAll = 0;
  for (let ci = 0; ci < nRows; ci++) {
    for (let cj = 0; cj < nCols; cj++) {
      const c = counts[ci * nCols + cj];
      if (c > maxAll) maxAll = c;
      if (!(sameBook && ci === cj) && c > maxOffDiag) maxOffDiag = c;
    }
  }

  return { counts, topTier, nRows, nCols, offI, offJ, sameBook, maxOffDiag, maxAll };
}

/**
 * Collect the actual references between one chapter of book I and one chapter
 * of book J, strongest-first (by tier, then vote count). Returns plain objects.
 */
export function getCellReferences(references, tierVisibility, bookINum, bookJNum, globalFrom, globalTo) {
  const out = [];
  for (let k = 0; k < references.length; k++) {
    const ref = references[k];
    if (ref.fromBook !== bookINum || ref.toBook !== bookJNum) continue;
    if (ref.from !== globalFrom || ref.to !== globalTo) continue;
    if (!tierVisibility[ref.tier]) continue;
    out.push(ref);
  }
  out.sort((a, b) => (a.tier - b.tier) || (b.votes - a.votes));
  return out;
}

/**
 * Build the direction-aware "Ledger" display matrices from the pre-computed
 * public/data/book_matrix.json (see 04_export.build_book_matrix). That file is
 * the ONLY honest source of quotation direction at the book level: the chapter
 * aggregate stores references bidirectionally, so its from->to orientation
 * cannot claim direction. book_matrix.json is pair-deduped and oriented by the
 * classifier's `quoter` column.
 *
 * Returns flat 66x66 arrays honoring the active tier filter:
 *   warmCount[i*66+j]  directed tiers 1-2, row i = speaker, col j = quoted
 *   warmTier[...]      strongest directed tier in that cell (1|2) or 6
 *   groundCount[...]   undirected tiers 3-5, symmetric kinship (both triangles)
 *   symCount[...]      symmetric total of everything visible (drill/tooltip gate)
 * plus raw + per-chapter-pair-density maxima (off-diagonal) for both scalings.
 */
export function buildLedgerMatrices(data, tierVisibility, chapters) {
  const N = N_BOOKS;
  const warmCount = new Int32Array(N * N);
  const warmTier = new Int8Array(N * N).fill(NO_TIER);
  const groundCount = new Int32Array(N * N);
  const symCount = new Int32Array(N * N);

  const empty = {
    warmCount, warmTier, groundCount, symCount,
    maxWarmRaw: 0, maxWarmDens: 0, maxGroundRaw: 0, maxGroundDens: 0,
    maxSymRaw: 0, maxSymDens: 0,
  };
  if (!data) return empty;

  // Directed tiers 1-2: keep orientation for the warm layer; fold both ways
  // into the symmetric total.
  for (const t of [1, 2]) {
    if (!tierVisibility[t]) continue;
    const triples = data.directed?.[String(t)] || [];
    for (let k = 0; k < triples.length; k++) {
      const [r, c, n] = triples[k];
      const idx = r * N + c;
      warmCount[idx] += n;
      if (t < warmTier[idx]) warmTier[idx] = t;
      symCount[idx] += n;
      if (r !== c) symCount[c * N + r] += n;
    }
  }

  // Undirected tiers 3-5: stored as a<=b; mirror into both triangles.
  for (const t of [3, 4, 5]) {
    if (!tierVisibility[t]) continue;
    const triples = data.undirected?.[String(t)] || [];
    for (let k = 0; k < triples.length; k++) {
      const [a, b, n] = triples[k];
      groundCount[a * N + b] += n;
      symCount[a * N + b] += n;
      if (a !== b) {
        groundCount[b * N + a] += n;
        symCount[b * N + a] += n;
      }
    }
  }

  let maxWarmRaw = 0, maxWarmDens = 0;
  let maxGroundRaw = 0, maxGroundDens = 0;
  let maxSymRaw = 0, maxSymDens = 0;
  for (let i = 0; i < N; i++) {
    const ci = chapters ? chapters[i] : 1;
    for (let j = 0; j < N; j++) {
      if (i === j) continue; // maxima ignore the (de-emphasized) diagonal
      const idx = i * N + j;
      const pairs = ci * (chapters ? chapters[j] : 1) || 1;
      const w = warmCount[idx];
      const g = groundCount[idx];
      const s = symCount[idx];
      if (w > maxWarmRaw) maxWarmRaw = w;
      if (g > maxGroundRaw) maxGroundRaw = g;
      if (s > maxSymRaw) maxSymRaw = s;
      const wd = w / pairs, gd = g / pairs, sd = s / pairs;
      if (wd > maxWarmDens) maxWarmDens = wd;
      if (gd > maxGroundDens) maxGroundDens = gd;
      if (sd > maxSymDens) maxSymDens = sd;
    }
  }

  return {
    warmCount, warmTier, groundCount, symCount,
    maxWarmRaw, maxWarmDens, maxGroundRaw, maxGroundDens, maxSymRaw, maxSymDens,
  };
}

export { N_BOOKS, NO_TIER };
