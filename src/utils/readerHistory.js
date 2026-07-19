const KEY = 'bible-reader-last';

export function getLastRead() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const [slug, chapter] = raw.split('/');
    if (!slug || !chapter) return null;
    return { slug, chapter };
  } catch {
    return null;
  }
}

export function setLastRead(slug, chapter) {
  try {
    localStorage.setItem(KEY, `${slug}/${chapter}`);
  } catch {
    // localStorage unavailable (private mode, etc.) — non-fatal
  }
}
