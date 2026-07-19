"""
Gold-standard set of well-attested NT direct quotations of the OT.

Each entry is (nt_book_num, nt_chapter, nt_verse, ot_book_num, ot_chapter, ot_verse)
using the book numbering in config.BOOKS (OT = 1-39, NT = 40-66).

These are verse-level anchors for quotations that are essentially undisputed
in NT scholarship (direct quotation, not mere allusion). Where a quotation
spans several verses on either side, we anchor on the verse pair TSK-style
cross-reference data is most likely to carry directly (typically the first
verse of the quoted span, or -- for well-known catenae like Rom 3:10-18 and
Heb 1 -- one entry per member of the catena, since TSK generally links those
verse-by-verse rather than as a single range).

CAUTION (documented per project brief): the KJV New Testament frequently
quotes the Septuagint (LXX), not the Masoretic-based Hebrew that most KJV Old
Testament translation follows. Where the LXX and MT diverge in wording
(e.g. Heb 1:6 / Deut 32:43, Heb 10:5-7 / Ps 40:6-8, Acts 15:16-17 / Amos
9:11-12, Matt 12:21 / Isa 42:4), English token overlap between the KJV NT
and KJV OT can be much lower than the underlying quotation actually
warrants. This is a known, expected source of recall loss in the
token-overlap check -- NOT evidence the classifier is broken. See
03_classify.py: if measured recall against this gold set is poor (<60%),
the Tier-1 overlap minimum is loosened from >=3 to >=2 shared tokens
(only when a strong, non-generic quotation formula is present) and recall
is re-measured.

A handful of "traditional" NT attributions are textually contested (e.g.
Matt 27:9-10 is attributed to "Jeremy" / Jeremiah in the text but the
wording actually matches Zechariah 11:12-13, a long-recognized crux in NT
scholarship). For these we anchor on the verse that is actually quoted
(the wording match), not the named attribution, since the classifier's
overlap check depends on actual shared text.
"""

GOLD_STANDARD_QUOTES = [
    # --- Matthew ---
    (40, 1, 23, 23, 7, 14),    # Matt 1:23 -> Isa 7:14 (Immanuel)
    (40, 2, 6, 33, 5, 2),      # Matt 2:6 -> Micah 5:2 (Bethlehem)
    (40, 2, 15, 28, 11, 1),    # Matt 2:15 -> Hosea 11:1 (out of Egypt)
    (40, 2, 18, 24, 31, 15),   # Matt 2:18 -> Jer 31:15 (Rachel weeping)
    (40, 3, 3, 23, 40, 3),     # Matt 3:3 -> Isa 40:3 (voice in the wilderness)
    (40, 4, 4, 5, 8, 3),       # Matt 4:4 -> Deut 8:3 (man shall not live by bread alone)
    (40, 4, 6, 19, 91, 11),    # Matt 4:6 -> Ps 91:11 (he shall give his angels charge)
    (40, 4, 7, 5, 6, 16),      # Matt 4:7 -> Deut 6:16 (tempt not the Lord)
    (40, 4, 10, 5, 6, 13),     # Matt 4:10 -> Deut 6:13 (worship the Lord thy God)
    (40, 4, 15, 23, 9, 1),     # Matt 4:15 -> Isa 9:1 (Galilee of the Gentiles)
    (40, 5, 21, 2, 20, 13),    # Matt 5:21 -> Exod 20:13 (thou shalt not kill)
    (40, 5, 27, 2, 20, 14),    # Matt 5:27 -> Exod 20:14 (thou shalt not commit adultery)
    (40, 5, 31, 5, 24, 1),     # Matt 5:31 -> Deut 24:1 (writing of divorcement)
    (40, 5, 38, 2, 21, 24),    # Matt 5:38 -> Exod 21:24 (eye for an eye)
    (40, 5, 43, 3, 19, 18),    # Matt 5:43 -> Lev 19:18 (love thy neighbour)
    (40, 9, 13, 28, 6, 6),     # Matt 9:13 -> Hosea 6:6 (I will have mercy, not sacrifice)
    (40, 11, 10, 39, 3, 1),    # Matt 11:10 -> Mal 3:1 (I send my messenger)
    (40, 12, 7, 28, 6, 6),     # Matt 12:7 -> Hosea 6:6
    (40, 12, 18, 23, 42, 1),   # Matt 12:18 -> Isa 42:1 (behold my servant)
    (40, 13, 14, 23, 6, 9),    # Matt 13:14 -> Isa 6:9 (hearing ye shall hear)
    (40, 13, 35, 19, 78, 2),   # Matt 13:35 -> Ps 78:2 (open my mouth in parables)
    (40, 15, 8, 23, 29, 13),   # Matt 15:8 -> Isa 29:13 (this people draweth nigh with mouth)
    (40, 19, 4, 1, 1, 27),     # Matt 19:4 -> Gen 1:27 (male and female)
    (40, 19, 5, 1, 2, 24),     # Matt 19:5 -> Gen 2:24 (leave father and mother)
    (40, 19, 18, 2, 20, 13),   # Matt 19:18 -> Exod 20:13 (thou shalt not kill / decalogue block)
    (40, 21, 5, 38, 9, 9),     # Matt 21:5 -> Zech 9:9 (thy king cometh)
    (40, 21, 9, 19, 118, 26),  # Matt 21:9 -> Ps 118:26 (blessed is he that cometh)
    (40, 21, 13, 23, 56, 7),   # Matt 21:13 -> Isa 56:7 (house of prayer)
    (40, 21, 16, 19, 8, 2),    # Matt 21:16 -> Ps 8:2 (out of the mouth of babes)
    (40, 21, 42, 19, 118, 22), # Matt 21:42 -> Ps 118:22 (stone the builders rejected)
    (40, 22, 24, 5, 25, 5),    # Matt 22:24 -> Deut 25:5 (levirate marriage)
    (40, 22, 32, 2, 3, 6),     # Matt 22:32 -> Exod 3:6 (God of Abraham, Isaac, Jacob)
    (40, 22, 37, 5, 6, 5),     # Matt 22:37 -> Deut 6:5 (love the Lord thy God)
    (40, 22, 39, 3, 19, 18),   # Matt 22:39 -> Lev 19:18
    (40, 22, 44, 19, 110, 1),  # Matt 22:44 -> Ps 110:1 (the LORD said unto my Lord)
    (40, 23, 39, 19, 118, 26), # Matt 23:39 -> Ps 118:26
    (40, 24, 15, 27, 9, 27),   # Matt 24:15 -> Dan 9:27 (abomination of desolation)
    (40, 26, 31, 38, 13, 7),   # Matt 26:31 -> Zech 13:7 (smite the shepherd)
    (40, 26, 64, 27, 7, 13),   # Matt 26:64 -> Dan 7:13 (coming in the clouds)
    (40, 27, 9, 38, 11, 13),   # Matt 27:9-10 -> Zech 11:13 (thirty pieces of silver; textual crux, see module docstring)
    (40, 27, 35, 19, 22, 18),  # Matt 27:35 -> Ps 22:18 (parted my garments, cast lots)
    (40, 27, 46, 19, 22, 1),   # Matt 27:46 -> Ps 22:1 (my God, my God, why hast thou forsaken me)

    # --- Mark ---
    (41, 1, 2, 39, 3, 1),      # Mark 1:2 -> Mal 3:1
    (41, 1, 3, 23, 40, 3),     # Mark 1:3 -> Isa 40:3
    (41, 7, 6, 23, 29, 13),    # Mark 7:6 -> Isa 29:13
    (41, 7, 10, 2, 20, 12),    # Mark 7:10 -> Exod 20:12 (honour thy father and mother)
    (41, 10, 6, 1, 1, 27),     # Mark 10:6 -> Gen 1:27
    (41, 10, 7, 1, 2, 24),     # Mark 10:7-8 -> Gen 2:24
    (41, 10, 19, 2, 20, 12),   # Mark 10:19 -> Exod 20:12
    (41, 11, 9, 19, 118, 26),  # Mark 11:9 -> Ps 118:26
    (41, 12, 10, 19, 118, 22), # Mark 12:10 -> Ps 118:22
    (41, 12, 19, 5, 25, 5),    # Mark 12:19 -> Deut 25:5
    (41, 12, 26, 2, 3, 6),     # Mark 12:26 -> Exod 3:6
    (41, 12, 29, 5, 6, 4),     # Mark 12:29 -> Deut 6:4
    (41, 12, 30, 5, 6, 5),     # Mark 12:30 -> Deut 6:5
    (41, 12, 31, 3, 19, 18),   # Mark 12:31 -> Lev 19:18
    (41, 12, 36, 19, 110, 1),  # Mark 12:36 -> Ps 110:1
    (41, 14, 27, 38, 13, 7),   # Mark 14:27 -> Zech 13:7
    (41, 15, 34, 19, 22, 1),   # Mark 15:34 -> Ps 22:1

    # --- Luke ---
    (42, 3, 4, 23, 40, 3),     # Luke 3:4 -> Isa 40:3
    (42, 4, 4, 5, 8, 3),       # Luke 4:4 -> Deut 8:3
    (42, 4, 8, 5, 6, 13),      # Luke 4:8 -> Deut 6:13
    (42, 4, 10, 19, 91, 11),   # Luke 4:10 -> Ps 91:11
    (42, 4, 12, 5, 6, 16),     # Luke 4:12 -> Deut 6:16
    (42, 4, 18, 23, 61, 1),    # Luke 4:18 -> Isa 61:1
    (42, 10, 27, 5, 6, 5),     # Luke 10:27 -> Deut 6:5
    (42, 19, 46, 23, 56, 7),   # Luke 19:46 -> Isa 56:7
    (42, 20, 17, 19, 118, 22), # Luke 20:17 -> Ps 118:22
    (42, 20, 28, 5, 25, 5),    # Luke 20:28 -> Deut 25:5
    (42, 20, 37, 2, 3, 6),     # Luke 20:37 -> Exod 3:6
    (42, 20, 42, 19, 110, 1),  # Luke 20:42 -> Ps 110:1
    (42, 22, 37, 23, 53, 12),  # Luke 22:37 -> Isa 53:12

    # --- John ---
    (43, 1, 23, 23, 40, 3),    # John 1:23 -> Isa 40:3
    (43, 2, 17, 19, 69, 9),    # John 2:17 -> Ps 69:9 (zeal of thine house)
    (43, 6, 31, 19, 78, 24),   # John 6:31 -> Ps 78:24 (bread from heaven)
    (43, 6, 45, 23, 54, 13),   # John 6:45 -> Isa 54:13 (taught of God)
    (43, 10, 34, 19, 82, 6),   # John 10:34 -> Ps 82:6 (ye are gods)
    (43, 12, 15, 38, 9, 9),    # John 12:15 -> Zech 9:9
    (43, 12, 38, 23, 53, 1),   # John 12:38 -> Isa 53:1 (who hath believed our report)
    (43, 12, 40, 23, 6, 10),   # John 12:40 -> Isa 6:10
    (43, 13, 18, 19, 41, 9),   # John 13:18 -> Ps 41:9 (mine own familiar friend)
    (43, 15, 25, 19, 35, 19),  # John 15:25 -> Ps 35:19 (hated me without a cause)
    (43, 19, 24, 19, 22, 18),  # John 19:24 -> Ps 22:18
    (43, 19, 36, 2, 12, 46),   # John 19:36 -> Exod 12:46 (a bone shall not be broken)
    (43, 19, 37, 38, 12, 10),  # John 19:37 -> Zech 12:10 (they shall look on him whom they pierced)

    # --- Acts ---
    (44, 1, 20, 19, 69, 25),   # Acts 1:20 -> Ps 69:25 (let his habitation be desolate)
    (44, 2, 17, 29, 2, 28),    # Acts 2:17 -> Joel 2:28 (I will pour out my spirit)
    (44, 2, 20, 29, 2, 31),    # Acts 2:20 -> Joel 2:31 (sun turned into darkness)
    (44, 2, 21, 29, 2, 32),    # Acts 2:21 -> Joel 2:32 (whosoever shall call on the name of the Lord)
    (44, 2, 25, 19, 16, 8),    # Acts 2:25 -> Ps 16:8 (I foresaw the Lord always before my face)
    (44, 2, 27, 19, 16, 10),   # Acts 2:27 -> Ps 16:10 (not leave my soul in hell)
    (44, 2, 34, 19, 110, 1),   # Acts 2:34 -> Ps 110:1
    (44, 3, 22, 5, 18, 15),    # Acts 3:22 -> Deut 18:15 (a prophet like unto me)
    (44, 4, 11, 19, 118, 22),  # Acts 4:11 -> Ps 118:22
    (44, 4, 25, 19, 2, 1),     # Acts 4:25 -> Ps 2:1 (why did the heathen rage)
    (44, 7, 49, 23, 66, 1),    # Acts 7:49 -> Isa 66:1 (heaven is my throne)
    (44, 8, 32, 23, 53, 7),    # Acts 8:32 -> Isa 53:7 (led as a sheep to the slaughter)
    (44, 13, 33, 19, 2, 7),    # Acts 13:33 -> Ps 2:7 (thou art my Son)
    (44, 13, 34, 23, 55, 3),   # Acts 13:34 -> Isa 55:3 (sure mercies of David)
    (44, 13, 35, 19, 16, 10),  # Acts 13:35 -> Ps 16:10
    (44, 13, 41, 35, 1, 5),    # Acts 13:41 -> Hab 1:5 (behold ye despisers)
    (44, 13, 47, 23, 49, 6),   # Acts 13:47 -> Isa 49:6 (light of the Gentiles)
    (44, 15, 16, 30, 9, 11),   # Acts 15:16 -> Amos 9:11 (tabernacle of David)
    (44, 23, 5, 2, 22, 28),    # Acts 23:5 -> Exod 22:28 (not speak evil of the ruler)
    (44, 28, 26, 23, 6, 9),    # Acts 28:26 -> Isa 6:9

    # --- Romans ---
    (45, 1, 17, 35, 2, 4),     # Rom 1:17 -> Hab 2:4 (just shall live by faith)
    (45, 2, 24, 23, 52, 5),    # Rom 2:24 -> Isa 52:5
    (45, 3, 4, 19, 51, 4),     # Rom 3:4 -> Ps 51:4 (that thou mightest be justified)
    (45, 3, 10, 19, 14, 1),    # Rom 3:10 -> Ps 14:1 (there is none righteous)
    (45, 3, 13, 19, 5, 9),     # Rom 3:13 -> Ps 5:9 (throat an open sepulchre)
    (45, 3, 14, 19, 10, 7),    # Rom 3:14 -> Ps 10:7 (mouth full of cursing)
    (45, 3, 15, 23, 59, 7),    # Rom 3:15 -> Isa 59:7 (feet swift to shed blood)
    (45, 3, 18, 19, 36, 1),    # Rom 3:18 -> Ps 36:1 (no fear of God before their eyes)
    (45, 4, 3, 1, 15, 6),      # Rom 4:3 -> Gen 15:6 (Abraham believed God)
    (45, 4, 7, 19, 32, 1),     # Rom 4:7 -> Ps 32:1 (blessed are they whose iniquities are forgiven)
    (45, 4, 17, 1, 17, 5),     # Rom 4:17 -> Gen 17:5 (father of many nations)
    (45, 4, 18, 1, 15, 5),     # Rom 4:18 -> Gen 15:5 (so shall thy seed be)
    (45, 8, 36, 19, 44, 22),   # Rom 8:36 -> Ps 44:22 (for thy sake we are killed all the day long)
    (45, 9, 7, 1, 21, 12),     # Rom 9:7 -> Gen 21:12 (in Isaac shall thy seed be called)
    (45, 9, 9, 1, 18, 10),     # Rom 9:9 -> Gen 18:10 (I will come and Sarah shall have a son)
    (45, 9, 12, 1, 25, 23),    # Rom 9:12 -> Gen 25:23 (the elder shall serve the younger)
    (45, 9, 13, 39, 1, 2),     # Rom 9:13 -> Mal 1:2 (Jacob have I loved)
    (45, 9, 15, 2, 33, 19),    # Rom 9:15 -> Exod 33:19 (I will have mercy on whom I will have mercy)
    (45, 9, 17, 2, 9, 16),     # Rom 9:17 -> Exod 9:16 (for this same purpose have I raised thee up)
    (45, 9, 25, 28, 2, 23),    # Rom 9:25 -> Hosea 2:23 (I will call them my people)
    (45, 9, 27, 23, 10, 22),   # Rom 9:27 -> Isa 10:22 (remnant shall be saved)
    (45, 9, 29, 23, 1, 9),     # Rom 9:29 -> Isa 1:9 (except the Lord had left us a seed)
    (45, 9, 33, 23, 28, 16),   # Rom 9:33 -> Isa 28:16 (stumblingstone)
    (45, 10, 5, 3, 18, 5),     # Rom 10:5 -> Lev 18:5 (which if a man do, he shall live in them)
    (45, 10, 6, 5, 30, 12),    # Rom 10:6 -> Deut 30:12 (who shall ascend into heaven)
    (45, 10, 11, 23, 28, 16),  # Rom 10:11 -> Isa 28:16
    (45, 10, 13, 29, 2, 32),   # Rom 10:13 -> Joel 2:32
    (45, 10, 15, 23, 52, 7),   # Rom 10:15 -> Isa 52:7 (beautiful feet of them that preach)
    (45, 10, 16, 23, 53, 1),   # Rom 10:16 -> Isa 53:1
    (45, 10, 18, 19, 19, 4),   # Rom 10:18 -> Ps 19:4 (their sound went into all the earth)
    (45, 10, 19, 5, 32, 21),   # Rom 10:19 -> Deut 32:21 (I will provoke you to jealousy)
    (45, 10, 20, 23, 65, 1),   # Rom 10:20 -> Isa 65:1 (I was found of them that sought me not)
    (45, 10, 21, 23, 65, 2),   # Rom 10:21 -> Isa 65:2 (I have stretched forth my hands)
    (45, 11, 3, 11, 19, 10),   # Rom 11:3 -> 1 Kings 19:10 (I only am left)
    (45, 11, 4, 11, 19, 18),   # Rom 11:4 -> 1 Kings 19:18 (7000 who have not bowed the knee)
    (45, 11, 8, 23, 29, 10),   # Rom 11:8 -> Isa 29:10 (spirit of slumber)
    (45, 11, 26, 23, 59, 20),  # Rom 11:26 -> Isa 59:20 (there shall come out of Zion the Deliverer)
    (45, 11, 34, 23, 40, 13),  # Rom 11:34 -> Isa 40:13 (who hath known the mind of the Lord)
    (45, 11, 35, 18, 41, 11),  # Rom 11:35 -> Job 41:11 (who hath first given to him)
    (45, 12, 19, 5, 32, 35),   # Rom 12:19 -> Deut 32:35 (vengeance is mine)
    (45, 12, 20, 20, 25, 21),  # Rom 12:20 -> Prov 25:21 (feed thine enemy)
    (45, 14, 11, 23, 45, 23),  # Rom 14:11 -> Isa 45:23 (every knee shall bow)
    (45, 15, 9, 19, 18, 49),   # Rom 15:9 -> Ps 18:49 (confess to thee among the Gentiles)
    (45, 15, 10, 5, 32, 43),   # Rom 15:10 -> Deut 32:43 (rejoice ye Gentiles)
    (45, 15, 11, 19, 117, 1),  # Rom 15:11 -> Ps 117:1 (praise the Lord, all ye Gentiles)
    (45, 15, 12, 23, 11, 10),  # Rom 15:12 -> Isa 11:10 (root of Jesse)
    (45, 15, 21, 23, 52, 15),  # Rom 15:21 -> Isa 52:15 (to whom he was not spoken of, they shall see)

    # --- 1 Corinthians ---
    (46, 1, 19, 23, 29, 14),   # 1 Cor 1:19 -> Isa 29:14 (destroy the wisdom of the wise)
    (46, 1, 31, 24, 9, 24),    # 1 Cor 1:31 -> Jer 9:24 (let him glory in the Lord)
    (46, 2, 9, 23, 64, 4),     # 1 Cor 2:9 -> Isa 64:4 (eye hath not seen)
    (46, 2, 16, 23, 40, 13),   # 1 Cor 2:16 -> Isa 40:13 (who hath known the mind of the Lord)
    (46, 3, 19, 18, 5, 13),    # 1 Cor 3:19 -> Job 5:13 (he taketh the wise in their own craftiness)
    (46, 3, 20, 19, 94, 11),   # 1 Cor 3:20 -> Ps 94:11 (thoughts of the wise are vain)
    (46, 5, 13, 5, 17, 7),     # 1 Cor 5:13 -> Deut 17:7 (put away from among yourselves)
    (46, 9, 9, 5, 25, 4),      # 1 Cor 9:9 -> Deut 25:4 (thou shalt not muzzle the ox)
    (46, 10, 7, 2, 32, 6),     # 1 Cor 10:7 -> Exod 32:6 (sat down to eat and drink, rose up to play)
    (46, 10, 26, 19, 24, 1),   # 1 Cor 10:26 -> Ps 24:1 (the earth is the Lord's)
    (46, 14, 21, 23, 28, 11),  # 1 Cor 14:21 -> Isa 28:11 (other tongues will I speak)
    (46, 15, 27, 19, 8, 6),    # 1 Cor 15:27 -> Ps 8:6 (put all things under his feet)
    (46, 15, 32, 23, 22, 13),  # 1 Cor 15:32 -> Isa 22:13 (let us eat and drink, for tomorrow we die)
    (46, 15, 45, 1, 2, 7),     # 1 Cor 15:45 -> Gen 2:7 (man became a living soul)
    (46, 15, 54, 23, 25, 8),   # 1 Cor 15:54 -> Isa 25:8 (death is swallowed up in victory)
    (46, 15, 55, 28, 13, 14),  # 1 Cor 15:55 -> Hosea 13:14 (O death, where is thy sting)

    # --- 2 Corinthians ---
    (47, 6, 2, 23, 49, 8),     # 2 Cor 6:2 -> Isa 49:8 (in a time accepted I have heard thee)
    (47, 6, 16, 3, 26, 12),    # 2 Cor 6:16 -> Lev 26:12 (I will dwell in them)
    (47, 8, 15, 2, 16, 18),    # 2 Cor 8:15 -> Exod 16:18 (he that gathered much had nothing over)
    (47, 9, 9, 19, 112, 9),    # 2 Cor 9:9 -> Ps 112:9 (hath dispersed abroad, given to the poor)

    # --- Galatians ---
    (48, 3, 6, 1, 15, 6),      # Gal 3:6 -> Gen 15:6
    (48, 3, 8, 1, 12, 3),      # Gal 3:8 -> Gen 12:3 (in thee shall all nations be blessed)
    (48, 3, 10, 5, 27, 26),    # Gal 3:10 -> Deut 27:26 (cursed is every one that continueth not)
    (48, 3, 11, 35, 2, 4),     # Gal 3:11 -> Hab 2:4 (the just shall live by faith)
    (48, 3, 12, 3, 18, 5),     # Gal 3:12 -> Lev 18:5
    (48, 3, 13, 5, 21, 23),    # Gal 3:13 -> Deut 21:23 (cursed is every one that hangeth on a tree)
    (48, 3, 16, 1, 12, 7),     # Gal 3:16 -> Gen 12:7 (unto thy seed will I give this land)
    (48, 4, 27, 23, 54, 1),    # Gal 4:27 -> Isa 54:1 (rejoice, thou barren)
    (48, 4, 30, 1, 21, 10),    # Gal 4:30 -> Gen 21:10 (cast out the bondwoman and her son)

    # --- Ephesians ---
    (49, 4, 8, 19, 68, 18),    # Eph 4:8 -> Ps 68:18 (led captivity captive)
    (49, 5, 31, 1, 2, 24),     # Eph 5:31 -> Gen 2:24
    (49, 6, 2, 2, 20, 12),     # Eph 6:2 -> Exod 20:12

    # --- Hebrews ---
    (58, 1, 5, 19, 2, 7),      # Heb 1:5 -> Ps 2:7 (thou art my Son, this day have I begotten thee)
    (58, 1, 5, 10, 7, 14),     # Heb 1:5 -> 2 Sam 7:14 (I will be to him a father)
    (58, 1, 7, 19, 104, 4),    # Heb 1:7 -> Ps 104:4 (maketh his angels spirits)
    (58, 1, 8, 19, 45, 6),     # Heb 1:8 -> Ps 45:6 (thy throne, O God, is for ever)
    (58, 1, 10, 19, 102, 25),  # Heb 1:10 -> Ps 102:25 (of old hast laid the foundation of the earth)
    (58, 1, 13, 19, 110, 1),   # Heb 1:13 -> Ps 110:1
    (58, 2, 6, 19, 8, 4),      # Heb 2:6 -> Ps 8:4 (what is man that thou art mindful of him)
    (58, 2, 12, 19, 22, 22),   # Heb 2:12 -> Ps 22:22 (declare thy name unto my brethren)
    (58, 2, 13, 23, 8, 17),    # Heb 2:13 -> Isa 8:17 (I will put my trust in him)
    (58, 3, 7, 19, 95, 7),     # Heb 3:7 -> Ps 95:7 (to day if ye will hear his voice)
    (58, 4, 4, 1, 2, 2),       # Heb 4:4 -> Gen 2:2 (God did rest the seventh day)
    (58, 4, 7, 19, 95, 7),     # Heb 4:7 -> Ps 95:7
    (58, 5, 5, 19, 2, 7),      # Heb 5:5 -> Ps 2:7
    (58, 5, 6, 19, 110, 4),    # Heb 5:6 -> Ps 110:4 (thou art a priest for ever after Melchisedec)
    (58, 7, 17, 19, 110, 4),   # Heb 7:17 -> Ps 110:4
    (58, 7, 21, 19, 110, 4),   # Heb 7:21 -> Ps 110:4
    (58, 8, 8, 24, 31, 31),    # Heb 8:8 -> Jer 31:31 (I will make a new covenant)
    (58, 9, 20, 2, 24, 8),     # Heb 9:20 -> Exod 24:8 (blood of the testament)
    (58, 10, 5, 19, 40, 6),    # Heb 10:5 -> Ps 40:6 (sacrifice and offering thou wouldest not)
    (58, 10, 16, 24, 31, 33),  # Heb 10:16 -> Jer 31:33 (I will put my laws into their hearts)
    (58, 10, 30, 5, 32, 35),   # Heb 10:30 -> Deut 32:35 (vengeance belongeth unto me)
    (58, 10, 37, 35, 2, 3),    # Heb 10:37 -> Hab 2:3 (yet a little while)
    (58, 10, 38, 35, 2, 4),    # Heb 10:38 -> Hab 2:4 (the just shall live by faith)
    (58, 11, 18, 1, 21, 12),   # Heb 11:18 -> Gen 21:12 (in Isaac shall thy seed be called)
    (58, 12, 5, 20, 3, 11),    # Heb 12:5 -> Prov 3:11 (my son, despise not the chastening of the Lord)
    (58, 12, 20, 2, 19, 12),   # Heb 12:20 -> Exod 19:12 (if so much as a beast touch the mountain)
    (58, 12, 21, 5, 9, 19),    # Heb 12:21 -> Deut 9:19 (I exceedingly fear and quake)
    (58, 12, 26, 37, 2, 6),    # Heb 12:26 -> Hag 2:6 (yet once more I shake not the earth only)
    (58, 13, 5, 5, 31, 6),     # Heb 13:5 -> Deut 31:6 (I will never leave thee nor forsake thee)
    (58, 13, 6, 19, 118, 6),   # Heb 13:6 -> Ps 118:6 (the Lord is my helper)

    # --- James ---
    (59, 2, 8, 3, 19, 18),     # James 2:8 -> Lev 19:18
    (59, 2, 11, 2, 20, 13),    # James 2:11 -> Exod 20:13
    (59, 2, 23, 1, 15, 6),     # James 2:23 -> Gen 15:6
    (59, 4, 6, 20, 3, 34),     # James 4:6 -> Prov 3:34 (God resisteth the proud)

    # --- 1 Peter ---
    (60, 1, 16, 3, 11, 44),    # 1 Pet 1:16 -> Lev 11:44 (be ye holy, for I am holy)
    (60, 1, 24, 23, 40, 6),    # 1 Pet 1:24 -> Isa 40:6 (all flesh is as grass)
    (60, 2, 6, 23, 28, 16),    # 1 Pet 2:6 -> Isa 28:16
    (60, 2, 7, 19, 118, 22),   # 1 Pet 2:7 -> Ps 118:22
    (60, 2, 8, 23, 8, 14),     # 1 Pet 2:8 -> Isa 8:14 (a stone of stumbling)
    (60, 2, 9, 2, 19, 6),      # 1 Pet 2:9 -> Exod 19:6 (a kingdom of priests)
    (60, 2, 22, 23, 53, 9),    # 1 Pet 2:22 -> Isa 53:9 (neither was guile found in his mouth)
    (60, 2, 24, 23, 53, 5),    # 1 Pet 2:24 -> Isa 53:5 (with his stripes we are healed)
    (60, 2, 25, 23, 53, 6),    # 1 Pet 2:25 -> Isa 53:6 (all we like sheep have gone astray)
    (60, 3, 10, 19, 34, 12),   # 1 Pet 3:10 -> Ps 34:12 (what man is he that desireth life)
    (60, 3, 14, 23, 8, 12),    # 1 Pet 3:14 -> Isa 8:12 (fear not their fear)
    (60, 4, 18, 20, 11, 31),   # 1 Pet 4:18 -> Prov 11:31 (the righteous scarcely be saved)
    (60, 5, 5, 20, 3, 34),     # 1 Pet 5:5 -> Prov 3:34 (God resisteth the proud)

    # --- 2 Peter ---
    (61, 2, 22, 20, 26, 11),   # 2 Pet 2:22 -> Prov 26:11 (dog returned to his own vomit)

    # --- Revelation ---
    (66, 1, 7, 27, 7, 13),     # Rev 1:7 -> Dan 7:13 (behold, he cometh with clouds)
    (66, 2, 27, 19, 2, 9),     # Rev 2:27 -> Ps 2:9 (rule them with a rod of iron)
    (66, 15, 4, 19, 86, 9),    # Rev 15:4 -> Ps 86:9 (all nations shall come and worship)
    (66, 19, 15, 19, 2, 9),    # Rev 19:15 -> Ps 2:9
]
