import { Navigate } from 'react-router-dom';
import { getLastRead } from '../utils/readerHistory';
import { resolveBook, bookSlug } from '../utils/bookSlug';

/** /read -> last-read location (localStorage) or John 1. */
export default function ReaderRedirect() {
  const last = getLastRead();
  if (last) {
    const book = resolveBook(last.slug);
    if (book) {
      return <Navigate to={`/read/${bookSlug(book)}/${last.chapter}`} replace />;
    }
  }
  return <Navigate to="/read/john/1" replace />;
}
