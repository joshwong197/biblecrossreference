import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BOOKS, BOOK_GROUPS } from '../../constants/books';
import { chapterCount, bookSlug } from '../../utils/bookSlug';

const GROUPS = Object.values(BOOK_GROUPS)
  .map((group) => ({ group, books: BOOKS.filter((b) => b.group === group) }))
  .filter((g) => g.books.length > 0);

/** Simple two-step picker: book list, then a chapter grid — no search, per
 * DESIGN.md. Opens directly on the current book's chapter grid since that's
 * the far more common jump ("go to chapter 4"); "Books" steps back to pick
 * a different book. */
export default function BookChapterPicker({ currentBook, onClose }) {
  const [pickedBook, setPickedBook] = useState(currentBook);
  const navigate = useNavigate();

  function selectChapter(book, chapter) {
    navigate(`/read/${bookSlug(book)}/${chapter}`);
    onClose();
  }

  return (
    <>
      <div className="reader-fulllist__overlay" onClick={onClose} />
      <div className="reader-fulllist__panel reader-picker__panel" role="dialog" aria-label="Choose book and chapter">
        <div className="reader-fulllist__header">
          <span className="reader-fulllist__title">
            {pickedBook ? pickedBook.name : 'Choose a Book'}
          </span>
          <button type="button" className="reader-preview__close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="reader-fulllist__body">
          {!pickedBook && GROUPS.map(({ group, books }) => (
            <div key={group}>
              <div className="reader-picker__group-label">{group}</div>
              {books.map((b) => (
                <button
                  key={b.abbrev}
                  type="button"
                  className="reader-picker__item"
                  onClick={() => setPickedBook(b)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          ))}

          {pickedBook && (
            <>
              <button type="button" className="reader-picker__back" onClick={() => setPickedBook(null)}>
                &larr; Books
              </button>
              <div className="reader-picker__chapter-grid">
                {Array.from({ length: chapterCount(pickedBook.abbrev) }, (_, i) => i + 1).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className="reader-picker__chapter-cell"
                    onClick={() => selectChapter(pickedBook, ch)}
                  >
                    {ch}
                  </button>
                ))}
              </div>
              <Link
                to={`/book/${bookSlug(pickedBook)}`}
                className="reader-picker__about"
                onClick={onClose}
              >
                About {pickedBook.name} &rarr;
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
