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
            We believe the Bible is the inspired Word of God &mdash; that its human authors, writing
            across 1,500 years, three languages, and multiple continents, were guided by a single
            divine Author. This project exists because we think the cross-reference data bears
            witness to that belief. We are not hiding behind neutrality: we built this because the
            interconnectedness of Scripture amazed us, and we wanted others to see it too.
          </p>
          <p style={styles.p}>
            That said, we have no interest in rigging the presentation. The data is open. The tier
            system lets you filter by connection strength. Every statistic below is verifiable. We
            trust the text to speak for itself &mdash; and we think it speaks powerfully.
          </p>

          <h3 style={styles.h3}>The Scale of the Network</h3>
          <p style={styles.p}>
            The Bible contains 31,102 verses. Of these, 97.4% are connected to at least one other
            verse through a cross-reference &mdash; only 805 verses in the entire text sit in
            isolation with no connection at all. Those isolated verses are almost exclusively
            genealogical records, census lists, and administrative details (1 Chronicles alone
            accounts for 142 of them). When you filter to only the strongest connections
            (Tiers 1&ndash;4), 22,422 verses &mdash; over 72% &mdash; remain linked.
          </p>
          <p style={styles.p}>
            The 343,609 cross-references connect 1,316 distinct book pairs out of a possible 2,145
            (61.4% connectivity). This means the majority of the Bible&rsquo;s 66 books are directly
            connected to most other books, despite being written by approximately 40 different authors
            over roughly 1,500 years, in three languages, across multiple continents. That kind of
            coherence across such a span of history is, to us, evidence of a mind behind the text
            that transcends any single human author.
          </p>

          <h3 style={styles.h3}>Not All Connections Are Equal</h3>
          <p style={styles.p}>
            A common objection is that cross-references are simply a cataloguing exercise &mdash; that
            any sufficiently large text, given enough human effort, could be mapped into a web of
            connections the same way a fan wiki links together fictional universes. We take this
            objection seriously, and our five-tier system was designed in part to address it.
          </p>
          <p style={styles.p}>
            Tier 5 (&ldquo;Shared Vocabulary&rdquo;) connections &mdash; where two verses merely share
            a place name or common word &mdash; account for 85.8% of all cross-references. These are
            indeed the kind of link that any compiled text might produce, and you can filter them out
            entirely in the visualization. What remains is more significant.
          </p>
          <p style={styles.p}>
            The 2,794 Tier 1 references are direct quotations: a later author explicitly citing an
            earlier text, often with an introductory formula like &ldquo;it is written.&rdquo; These
            are not imposed by modern editors &mdash; they are embedded in the text itself. 31 of the
            39 Old Testament books are directly quoted in the New Testament. The 419 Tier 2 references
            mark prophetic fulfillment claims, where a New Testament author states that a specific Old
            Testament passage has been fulfilled. These are not editorial opinions &mdash; they are
            claims made by the biblical authors themselves, and their existence is textually verifiable
            regardless of one&rsquo;s theological position.
          </p>

          <h3 style={styles.h3}>Structure, Not Just Surface</h3>
          <p style={styles.p}>
            The cross-reference network reveals structural patterns that go beyond shared vocabulary.
            The Psalms are the most internally interconnected book (3,005 intra-book connections in
            Tiers 1&ndash;4), reflecting their liturgical structure where psalms reference and build
            upon each other. Matthew and Luke share 925 connections and Matthew and Mark share 889,
            mapping the well-documented Synoptic parallels with precision. The highest-voted
            community connection &mdash; Jeremiah 29:11 to Isaiah 55:8 (314 votes) &mdash; links
            &ldquo;I know the plans I have for you&rdquo; to &ldquo;my thoughts are not your
            thoughts,&rdquo; a theological pairing that requires understanding of both passages, not
            just keyword overlap.
          </p>
          <p style={styles.p}>
            Even the shortest verse in the Bible &mdash; &ldquo;Jesus wept&rdquo; (John 11:35), just
            two words &mdash; has 29 cross-references. Most are Tier 5, as expected for a verse with
            almost no vocabulary to match on. But the Tier 4 connection to Luke 19:41 (&ldquo;he
            beheld the city, and wept over it&rdquo;) reflects genuine thematic awareness: these are
            the only two instances in the Gospels where Jesus is recorded weeping.
          </p>

          <h3 style={styles.h3}>What We Believe This Shows</h3>
          <p style={styles.p}>
            We believe the cross-reference web testifies to what Scripture claims about itself: that
            it is God-breathed (2 Timothy 3:16), that the Holy Spirit carried along its human authors
            (2 Peter 1:21), and that its unity reflects a single divine mind working across centuries.
            Forty authors who never met, writing in different languages and cultures, produced a
            library where 61% of all possible book pairs are directly connected and 97% of verses
            participate in a single interconnected network. To us, that is not coincidence &mdash; it
            is the fingerprint of a God who is sovereign over history and over his Word.
          </p>
          <p style={styles.p}>
            We also recognize that data alone does not compel faith. You may look at the same network
            and see a remarkable literary tradition sustained by human communities over millennia. We
            respect that reading, even as we disagree with it. What we ask is that you engage with
            the data honestly &mdash; filter to Tiers 1&ndash;3 and see only the connections that are
            textually undeniable: direct quotes, fulfilled prophecies, and parallel accounts. Include
            Tier 4 for the thematic echoes that generations of scholars have identified. Include
            Tier 5 for the full, unfiltered web. The data is open; explore it for yourself and see
            what the Bible reveals.
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
