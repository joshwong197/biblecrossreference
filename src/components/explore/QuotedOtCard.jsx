import CardShell from './CardShell';
import MethodNote from './MethodNote';
import RefLink from './RefLink';

/**
 * A much-quoted Old Testament verse: the verse in serif, how many times the
 * New Testament quotes it, and the quoting passages as tappable ref chips.
 * Quoters can repeat in the data (e.g. two Gospels quote the same way); we
 * de-duplicate for the chip row so each destination shows once.
 */
export default function QuotedOtCard({ ref: refStr, text, ntQuotes, quoters, total }) {
  const uniqueQuoters = [...new Set(quoters)];

  return (
    <CardShell eyebrow="Quoted in the New Testament">
      <RefLink refStr={refStr} variant="head" />
      <p className="xscripture">{text}</p>

      <p className="xquoted__count">
        Quoted <strong>{ntQuotes}</strong> times in the New Testament
      </p>

      <div className="xchips">
        {uniqueQuoters.map((q) => (
          <RefLink key={q} refStr={q} variant="chip" />
        ))}
      </div>

      <MethodNote total={total} />
    </CardShell>
  );
}
