import { Link } from 'react-router-dom';

/**
 * Quiet per-card footer: names the dataset the claim was computed from and
 * links to the methodology page. No invented figures — `total` comes from
 * insights.json stats. Rendered only where a card makes a computed claim.
 */
export default function MethodNote({ total, children }) {
  return (
    <p className="xcard__method">
      {children ||
        `Computed from ${total.toLocaleString('en-US')} classified references.`}{' '}
      <Link className="xcard__method-link" to="/about">
        How?
      </Link>
    </p>
  );
}
