/**
 * Transform compact JSON data into normalized format for the app.
 * The exported JSON uses short keys (f, t, r, v, fb, tb) to save space.
 * This normalizes them to readable names.
 */

export function normalizeReferences(compactRefs) {
  return compactRefs.map((r) => ({
    from: r.f,
    to: r.t,
    tier: r.r,
    votes: r.v,
    fromBook: r.fb,
    toBook: r.tb,
  }));
}
