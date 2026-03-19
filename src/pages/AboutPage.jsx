import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <Link to="/" style={styles.backLink}>&larr; Back to visualization</Link>

        <h1 style={styles.h1}>About This Project</h1>

        <section style={styles.section}>
          <h2 style={styles.h2}>What Is This?</h2>
          <p style={styles.p}>
            This is an interactive visualization of cross-references within the Bible &mdash;
            connections between passages that quote, echo, parallel, or reference each other.
            The original visualization was created by Chris Harrison and Christoph R&ouml;mhild.
            This project recreates it from open data, adds a confidence-based classification system,
            and offers three different ways to explore the connections.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>The Five-Tier Classification System</h2>
          <p style={styles.p}>
            Not all cross-references are equal. A direct quote is fundamentally different from two
            passages that happen to mention the same place name. Our tier system classifies each
            of the ~340,000 cross-references by the strength of the connection.
          </p>

          <div style={styles.tierList}>
            <TierCard
              tier={1}
              name="Direct Quotation"
              color="var(--tier-1)"
              description="The later text explicitly quotes the earlier text, often with an introductory formula like 'it is written.'"
              example="Matthew 4:4 quoting Deuteronomy 8:3"
            />
            <TierCard
              tier={2}
              name="Allusion / Fulfillment"
              color="var(--tier-2)"
              description="The author clearly references an earlier passage without a word-for-word quote, often citing prophetic fulfillment."
              example="Matthew 1:22-23 referencing Isaiah 7:14"
            />
            <TierCard
              tier={3}
              name="Parallel Passage"
              color="var(--tier-3)"
              description="The same event, genealogy, law, or speech recorded independently in multiple books."
              example="Synoptic Gospel parallels (Matthew/Mark/Luke)"
            />
            <TierCard
              tier={4}
              name="Thematic Echo"
              color="var(--tier-4)"
              description="Shared theological concepts, imagery, or doctrine without explicit citation. These are more subjective."
              example="'Shepherd' imagery in Psalm 23, Ezekiel 34, and John 10"
            />
            <TierCard
              tier={5}
              name="Shared Vocabulary"
              color="var(--tier-5)"
              description="Two passages share a place name or common word but have no meaningful narrative or theological connection."
              example="1 Samuel 1:1 and Judges 19:1 both mention 'mount Ephraim'"
            />
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Data Sources</h2>
          <p style={styles.p}>
            The cross-reference data comes from OpenBible.info, which compiled ~340,000 references
            primarily from the Treasury of Scripture Knowledge (a public-domain reference work).
            The community has voted on the relevance of each reference, producing a confidence score.
            The Bible text used is the King James Version (public domain).
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Why Do Cross-References Matter?</h2>
          <p style={styles.p}>
            The Bible was written by approximately 40 different authors over roughly 1,500 years,
            in three languages, across multiple continents. Despite this, the cross-reference web
            shows that later authors consistently engage with earlier texts &mdash; quoting them,
            fulfilling their predictions, echoing their imagery, and recording the same events.
          </p>
          <p style={styles.p}>
            This density of intentional, verifiable internal cross-referencing is a distinguishing
            feature of the Bible compared to other compiled anthologies. The visualization makes
            this pattern visible in a way that text alone cannot.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Credits</h2>
          <ul style={styles.list}>
            <li>Chris Harrison / Christoph R&ouml;mhild for the original visualization concept</li>
            <li>OpenBible.info for the cross-reference dataset</li>
            <li>Treasury of Scripture Knowledge (R.A. Torrey) as the underlying reference work</li>
            <li>scrollmapper/bible_databases for the structured data</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function TierCard({ tier, name, color, description, example }) {
  return (
    <div style={styles.tierCard}>
      <div style={styles.tierHeader}>
        <span style={{ ...styles.tierSwatch, backgroundColor: color }} />
        <strong>Tier {tier} &mdash; {name}</strong>
      </div>
      <p style={styles.tierDesc}>{description}</p>
      <p style={styles.tierExample}>Example: {example}</p>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 16px',
  },
  content: {
    maxWidth: 720,
    margin: '0 auto',
  },
  backLink: {
    fontSize: 14,
    color: 'var(--accent)',
    marginBottom: 24,
    display: 'inline-block',
  },
  h1: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 12,
  },
  section: {
    marginBottom: 40,
  },
  p: {
    fontSize: 15,
    lineHeight: 1.7,
    color: 'var(--text-secondary)',
    marginBottom: 12,
  },
  list: {
    fontSize: 15,
    lineHeight: 1.7,
    color: 'var(--text-secondary)',
    paddingLeft: 20,
  },
  tierList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  tierCard: {
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-secondary)',
  },
  tierHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    fontSize: 15,
    color: 'var(--text-primary)',
  },
  tierSwatch: {
    display: 'inline-block',
    width: 14,
    height: 14,
    borderRadius: 3,
    flexShrink: 0,
  },
  tierDesc: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 4,
  },
  tierExample: {
    fontSize: 13,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
};
