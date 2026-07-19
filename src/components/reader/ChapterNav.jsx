import { Link, useNavigate } from 'react-router-dom';
import { prevChapterOf, nextChapterOf, bookSlug } from '../../utils/bookSlug';

export default function ChapterNav({ book, chapter, onOpenPicker }) {
  const navigate = useNavigate();
  const prev = prevChapterOf(book, chapter);
  const next = nextChapterOf(book, chapter);

  return (
    <div className="reader-chapter-nav">
      <button
        type="button"
        className="reader-chapter-nav__arrow"
        onClick={() => prev && navigate(`/read/${bookSlug(prev.book)}/${prev.chapter}`)}
        disabled={!prev}
        aria-label="Previous chapter"
      >
        &larr;
      </button>
      <span className="reader-chapter-nav__title">
        <Link to={`/book/${bookSlug(book)}`} className="reader-chapter-nav__booklink">
          {book.name}
        </Link>
        <button type="button" className="reader-chapter-nav__chapterbtn" onClick={onOpenPicker}>
          {chapter}
        </button>
      </span>
      <button
        type="button"
        className="reader-chapter-nav__arrow"
        onClick={() => next && navigate(`/read/${bookSlug(next.book)}/${next.chapter}`)}
        disabled={!next}
        aria-label="Next chapter"
      >
        &rarr;
      </button>
    </div>
  );
}
