import { TIERS } from '../../constants/tiers';
import CardShell from './CardShell';
import MethodNote from './MethodNote';
import RefLink from './RefLink';

/**
 * A single record-holder from the superlatives block. Each variant renders
 * only fields present in the data — a big number, a plain-language line, and
 * any refs deep-linked into the Reader.
 */
export default function SuperlativeCard({ variant, data, total }) {
  let big;
  let label;
  let body;

  if (variant === 'most_connected_chapter') {
    big = data.count.toLocaleString('en-US');
    label = 'references';
    body = (
      <p className="xsup__body">
        <RefLink refStr={data.ref} variant="chip" /> is the single most
        connected chapter in scripture.
      </p>
    );
  } else if (variant === 'most_quoting_nt_book') {
    big = data.t12_count.toLocaleString('en-US');
    label = 'quotes & allusions';
    body = (
      <p className="xsup__body">
        <RefLink refStr={`${data.book}.1`} variant="chip">{data.book}</RefLink>{' '}
        draws on the Old Testament more than any other New Testament book
        (Tier 1–2 links).
      </p>
    );
  } else if (variant === 'highest_voted_pair') {
    const tierInfo = TIERS[data.tier];
    big = data.votes.toLocaleString('en-US');
    label = 'community weight';
    body = (
      <p className="xsup__body">
        The most heavily weighted single pair links{' '}
        <RefLink refStr={data.from} variant="chip" /> and{' '}
        <RefLink refStr={data.to} variant="chip" /> — classified{' '}
        {tierInfo ? `${tierInfo.shortLabel} (Tier ${data.tier})` : `Tier ${data.tier}`}.
      </p>
    );
  } else if (variant === 'tier1_cross_testament_count') {
    big = data.toLocaleString('en-US');
    label = 'direct quotations';
    body = (
      <p className="xsup__body">
        Direct quotations that cross the Testament divide — the New Testament
        quoting the Old, word for word.
      </p>
    );
  } else {
    return null;
  }

  return (
    <CardShell eyebrow="Superlative">
      <p className="xsup__headline">
        <span className="xsup__big">{big}</span>
        <span className="xsup__big-label">{label}</span>
      </p>
      {body}
      <MethodNote total={total} />
    </CardShell>
  );
}
