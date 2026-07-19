import { TIERS } from '../../constants/tiers';
import CardShell from './CardShell';
import MethodNote from './MethodNote';
import RefLink from './RefLink';

/**
 * A single connection between two passages: earlier text over later text,
 * both in serif, with the tier badge and the community weight (votes).
 * Serves both the messianic thread (OT -> NT) and the Genesis -> Revelation
 * arc — the card is agnostic about which. Ambiguous connections get the
 * same "approximate classification" treatment the Reader uses.
 */
export default function ConnectionCard({ fromRef, fromText, toRef, toText, tier, votes, ambiguous, total }) {
  const tierInfo = TIERS[tier];
  const eyebrow = `${tierInfo.label} · Tier ${tier}`;

  return (
    <CardShell eyebrow={eyebrow} dotVar={tierInfo.cssVar}>
      <div className="xconn__side">
        <RefLink refStr={fromRef} variant="head" />
        <p className="xscripture">{fromText}</p>
      </div>

      <div className="xconn__link" aria-hidden="true">↓</div>

      <div className="xconn__side">
        <RefLink refStr={toRef} variant="head" />
        <p className="xscripture">{toText}</p>
      </div>

      {ambiguous && (
        <p className="xcard__approx">
          &asymp; Approximate classification — auto-detected and may be imprecise.
        </p>
      )}

      <div className="xcard__foot">
        <span className="xweight" title="Community weight from reference votes">
          community weight {votes.toLocaleString('en-US')}
        </span>
        <MethodNote total={total} />
      </div>
    </CardShell>
  );
}
