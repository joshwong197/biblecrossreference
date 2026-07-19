import { useArtImage } from '../../hooks/useArtImage';

/**
 * Optional chapter-top banner (see public/art/README.md for the file
 * convention). Renders nothing until the probe confirms the image actually
 * loads — absence of the file is indistinguishable from today's plain
 * header (zero layout shift, no broken-image flash). Not sticky: it lives
 * in normal document flow inside .reader-chapter-header and scrolls away
 * with the rest of the chapter, by design (DESIGN.md: never distract during
 * reading).
 */
export default function BookArtBanner({ abbrev }) {
  const { status, src } = useArtImage(abbrev);
  if (status !== 'loaded') return null;

  return (
    <div className="reader-chapter-art" aria-hidden="true">
      <img src={src} alt="" className="reader-chapter-art__img" loading="lazy" />
      <div className="reader-chapter-art__scrim" />
    </div>
  );
}
