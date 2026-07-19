/**
 * Shared card frame for the feed: --bg-raised on --bg, 1px --line border,
 * an uppercase eyebrow (optionally with a tier-colored dot). Body is the
 * card's own content. Keeps every card type visually continuous.
 */
export default function CardShell({ eyebrow, dotVar, children }) {
  return (
    <article className="xcard">
      {eyebrow && (
        <div className="xcard__eyebrow">
          {dotVar && (
            <span
              className="xcard__eyebrow-dot"
              style={{ backgroundColor: `var(${dotVar})` }}
            />
          )}
          {eyebrow}
        </div>
      )}
      {children}
    </article>
  );
}
