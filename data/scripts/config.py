"""Shared constants for the Bible cross-reference data pipeline."""

# Canonical book order (1-66) with abbreviations matching OpenBible/scrollmapper formats
BOOKS = [
    {"num": 1,  "name": "Genesis",         "abbrev": "Gen",   "testament": "OT", "group": "Pentateuch",      "alt_abbrevs": ["Ge", "Gn"]},
    {"num": 2,  "name": "Exodus",          "abbrev": "Exod",  "testament": "OT", "group": "Pentateuch",      "alt_abbrevs": ["Ex", "Exo"]},
    {"num": 3,  "name": "Leviticus",       "abbrev": "Lev",   "testament": "OT", "group": "Pentateuch",      "alt_abbrevs": ["Le", "Lv"]},
    {"num": 4,  "name": "Numbers",         "abbrev": "Num",   "testament": "OT", "group": "Pentateuch",      "alt_abbrevs": ["Nu", "Nm"]},
    {"num": 5,  "name": "Deuteronomy",     "abbrev": "Deut",  "testament": "OT", "group": "Pentateuch",      "alt_abbrevs": ["Dt"]},
    {"num": 6,  "name": "Joshua",          "abbrev": "Josh",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["Jos"]},
    {"num": 7,  "name": "Judges",          "abbrev": "Judg",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["Jdg", "Jg"]},
    {"num": 8,  "name": "Ruth",            "abbrev": "Ruth",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["Ru"]},
    {"num": 9,  "name": "1 Samuel",        "abbrev": "1Sam",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["1Sa"]},
    {"num": 10, "name": "2 Samuel",        "abbrev": "2Sam",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["2Sa"]},
    {"num": 11, "name": "1 Kings",         "abbrev": "1Kgs",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["1Ki", "1Kin"]},
    {"num": 12, "name": "2 Kings",         "abbrev": "2Kgs",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["2Ki", "2Kin"]},
    {"num": 13, "name": "1 Chronicles",    "abbrev": "1Chr",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["1Ch"]},
    {"num": 14, "name": "2 Chronicles",    "abbrev": "2Chr",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["2Ch"]},
    {"num": 15, "name": "Ezra",            "abbrev": "Ezra",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["Ezr"]},
    {"num": 16, "name": "Nehemiah",        "abbrev": "Neh",   "testament": "OT", "group": "Historical",      "alt_abbrevs": ["Ne"]},
    {"num": 17, "name": "Esther",          "abbrev": "Esth",  "testament": "OT", "group": "Historical",      "alt_abbrevs": ["Est", "Es"]},
    {"num": 18, "name": "Job",             "abbrev": "Job",   "testament": "OT", "group": "Wisdom",          "alt_abbrevs": ["Jb"]},
    {"num": 19, "name": "Psalms",          "abbrev": "Ps",    "testament": "OT", "group": "Wisdom",          "alt_abbrevs": ["Psa", "Pss"]},
    {"num": 20, "name": "Proverbs",        "abbrev": "Prov",  "testament": "OT", "group": "Wisdom",          "alt_abbrevs": ["Pro", "Pr"]},
    {"num": 21, "name": "Ecclesiastes",    "abbrev": "Eccl",  "testament": "OT", "group": "Wisdom",          "alt_abbrevs": ["Ecc", "Ec"]},
    {"num": 22, "name": "Song of Solomon", "abbrev": "Song",  "testament": "OT", "group": "Wisdom",          "alt_abbrevs": ["SoS", "SS", "Sol"]},
    {"num": 23, "name": "Isaiah",          "abbrev": "Isa",   "testament": "OT", "group": "Major Prophets",  "alt_abbrevs": ["Is"]},
    {"num": 24, "name": "Jeremiah",        "abbrev": "Jer",   "testament": "OT", "group": "Major Prophets",  "alt_abbrevs": ["Je"]},
    {"num": 25, "name": "Lamentations",    "abbrev": "Lam",   "testament": "OT", "group": "Major Prophets",  "alt_abbrevs": ["La"]},
    {"num": 26, "name": "Ezekiel",         "abbrev": "Ezek",  "testament": "OT", "group": "Major Prophets",  "alt_abbrevs": ["Eze"]},
    {"num": 27, "name": "Daniel",          "abbrev": "Dan",   "testament": "OT", "group": "Major Prophets",  "alt_abbrevs": ["Da", "Dn"]},
    {"num": 28, "name": "Hosea",           "abbrev": "Hos",   "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": ["Ho"]},
    {"num": 29, "name": "Joel",            "abbrev": "Joel",  "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": ["Joe", "Jl"]},
    {"num": 30, "name": "Amos",            "abbrev": "Amos",  "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": ["Am"]},
    {"num": 31, "name": "Obadiah",         "abbrev": "Obad",  "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": ["Ob"]},
    {"num": 32, "name": "Jonah",           "abbrev": "Jonah", "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": ["Jon"]},
    {"num": 33, "name": "Micah",           "abbrev": "Mic",   "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": ["Mi"]},
    {"num": 34, "name": "Nahum",           "abbrev": "Nah",   "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": ["Na"]},
    {"num": 35, "name": "Habakkuk",        "abbrev": "Hab",   "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": []},
    {"num": 36, "name": "Zephaniah",       "abbrev": "Zeph",  "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": ["Zep"]},
    {"num": 37, "name": "Haggai",          "abbrev": "Hag",   "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": []},
    {"num": 38, "name": "Zechariah",       "abbrev": "Zech",  "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": ["Zec"]},
    {"num": 39, "name": "Malachi",         "abbrev": "Mal",   "testament": "OT", "group": "Minor Prophets",  "alt_abbrevs": []},
    {"num": 40, "name": "Matthew",         "abbrev": "Matt",  "testament": "NT", "group": "Gospels",         "alt_abbrevs": ["Mt"]},
    {"num": 41, "name": "Mark",            "abbrev": "Mark",  "testament": "NT", "group": "Gospels",         "alt_abbrevs": ["Mk", "Mr"]},
    {"num": 42, "name": "Luke",            "abbrev": "Luke",  "testament": "NT", "group": "Gospels",         "alt_abbrevs": ["Lk", "Lu"]},
    {"num": 43, "name": "John",            "abbrev": "John",  "testament": "NT", "group": "Gospels",         "alt_abbrevs": ["Jn", "Joh"]},
    {"num": 44, "name": "Acts",            "abbrev": "Acts",  "testament": "NT", "group": "Acts",            "alt_abbrevs": ["Ac"]},
    {"num": 45, "name": "Romans",          "abbrev": "Rom",   "testament": "NT", "group": "Pauline",         "alt_abbrevs": ["Ro"]},
    {"num": 46, "name": "1 Corinthians",   "abbrev": "1Cor",  "testament": "NT", "group": "Pauline",         "alt_abbrevs": ["1Co"]},
    {"num": 47, "name": "2 Corinthians",   "abbrev": "2Cor",  "testament": "NT", "group": "Pauline",         "alt_abbrevs": ["2Co"]},
    {"num": 48, "name": "Galatians",       "abbrev": "Gal",   "testament": "NT", "group": "Pauline",         "alt_abbrevs": ["Ga"]},
    {"num": 49, "name": "Ephesians",       "abbrev": "Eph",   "testament": "NT", "group": "Pauline",         "alt_abbrevs": []},
    {"num": 50, "name": "Philippians",     "abbrev": "Phil",  "testament": "NT", "group": "Pauline",         "alt_abbrevs": ["Php"]},
    {"num": 51, "name": "Colossians",      "abbrev": "Col",   "testament": "NT", "group": "Pauline",         "alt_abbrevs": []},
    {"num": 52, "name": "1 Thessalonians", "abbrev": "1Thess","testament": "NT", "group": "Pauline",         "alt_abbrevs": ["1Th"]},
    {"num": 53, "name": "2 Thessalonians", "abbrev": "2Thess","testament": "NT", "group": "Pauline",         "alt_abbrevs": ["2Th"]},
    {"num": 54, "name": "1 Timothy",       "abbrev": "1Tim",  "testament": "NT", "group": "Pauline",         "alt_abbrevs": ["1Ti"]},
    {"num": 55, "name": "2 Timothy",       "abbrev": "2Tim",  "testament": "NT", "group": "Pauline",         "alt_abbrevs": ["2Ti"]},
    {"num": 56, "name": "Titus",           "abbrev": "Titus", "testament": "NT", "group": "Pauline",         "alt_abbrevs": ["Tit"]},
    {"num": 57, "name": "Philemon",        "abbrev": "Phlm",  "testament": "NT", "group": "Pauline",         "alt_abbrevs": ["Phm"]},
    {"num": 58, "name": "Hebrews",         "abbrev": "Heb",   "testament": "NT", "group": "General",         "alt_abbrevs": []},
    {"num": 59, "name": "James",           "abbrev": "Jas",   "testament": "NT", "group": "General",         "alt_abbrevs": ["Jam"]},
    {"num": 60, "name": "1 Peter",         "abbrev": "1Pet",  "testament": "NT", "group": "General",         "alt_abbrevs": ["1Pe"]},
    {"num": 61, "name": "2 Peter",         "abbrev": "2Pet",  "testament": "NT", "group": "General",         "alt_abbrevs": ["2Pe"]},
    {"num": 62, "name": "1 John",          "abbrev": "1John", "testament": "NT", "group": "General",         "alt_abbrevs": ["1Jn", "1Jo"]},
    {"num": 63, "name": "2 John",          "abbrev": "2John", "testament": "NT", "group": "General",         "alt_abbrevs": ["2Jn", "2Jo"]},
    {"num": 64, "name": "3 John",          "abbrev": "3John", "testament": "NT", "group": "General",         "alt_abbrevs": ["3Jn", "3Jo"]},
    {"num": 65, "name": "Jude",            "abbrev": "Jude",  "testament": "NT", "group": "General",         "alt_abbrevs": ["Jd"]},
    {"num": 66, "name": "Revelation",      "abbrev": "Rev",   "testament": "NT", "group": "Revelation",      "alt_abbrevs": ["Re"]},
]

# Build lookup dictionaries
BOOK_BY_NUM = {b["num"]: b for b in BOOKS}
BOOK_BY_NAME = {b["name"]: b for b in BOOKS}

# Build abbreviation-to-number lookup (includes all alternative abbreviations)
ABBREV_TO_NUM = {}
for b in BOOKS:
    ABBREV_TO_NUM[b["abbrev"].lower()] = b["num"]
    ABBREV_TO_NUM[b["name"].lower()] = b["num"]
    for alt in b.get("alt_abbrevs", []):
        ABBREV_TO_NUM[alt.lower()] = b["num"]

# Add KJV CSV-specific name variants (e.g., "I Samuel" instead of "1 Samuel")
_KJV_NAME_VARIANTS = {
    "i samuel": 9, "ii samuel": 10,
    "i kings": 11, "ii kings": 12,
    "i chronicles": 13, "ii chronicles": 14,
    "i corinthians": 46, "ii corinthians": 47,
    "i thessalonians": 52, "ii thessalonians": 53,
    "i timothy": 54, "ii timothy": 55,
    "i peter": 60, "ii peter": 61,
    "i john": 62, "ii john": 63, "iii john": 64,
    "revelation of john": 66,
}
ABBREV_TO_NUM.update(_KJV_NAME_VARIANTS)

OT_BOOKS = [b for b in BOOKS if b["testament"] == "OT"]
NT_BOOKS = [b for b in BOOKS if b["testament"] == "NT"]

# Quotation formulas for Tier 1 detection
QUOTATION_FORMULAS = [
    "it is written",
    "as it is written",
    "the scripture saith",
    "the scripture says",
    "for it is written",
    "as the prophet said",
    "which was spoken",
    "which were spoken",
    "as he said",
    "as he saith",
    "as the scripture hath said",
    "the holy ghost saith",
    "saying",
    "david saith",
    "moses said",
    "isaiah the prophet",
    "the prophet esaias",
    "well spake the holy ghost by esaias",
    "as saith the prophet",
]

# Fulfillment formulas for Tier 2 detection
FULFILLMENT_FORMULAS = [
    "to fulfill",
    "that it might be fulfilled",
    "was fulfilled",
    "might be fulfilled",
    "then was fulfilled",
    "it was fulfilled",
    "spoken by the prophet",
    "spoken of the lord by the prophet",
    "spoken through the prophet",
    "fulfilled which was spoken",
    "as in the days of",
    "according to that which is written",
    "as it was spoken",
    "the prophecy of esaias",
]

# KJV-specific stop words (in addition to standard English stop words)
KJV_STOP_WORDS = {
    "thee", "thou", "thy", "thine", "ye", "hath", "doth",
    "unto", "shall", "shalt", "saith", "upon", "thereof",
    "wherefore", "hast", "art", "wilt", "didst", "dost",
    "hither", "thither", "whither", "hence", "thence",
    "henceforth", "thereof", "wherein", "whereby", "wherewith",
    "also", "even", "yea", "nay", "verily", "thus",
    "behold", "lo", "said", "came", "went", "come",
    "let", "say", "saying", "one", "now", "may",
}

# Theological vocabulary (words with theological significance)
THEOLOGICAL_TERMS = {
    "god", "lord", "christ", "jesus", "spirit", "holy",
    "covenant", "sacrifice", "atonement", "redemption",
    "righteousness", "salvation", "grace", "mercy", "faith",
    "sin", "iniquity", "transgression", "forgiveness",
    "lamb", "shepherd", "temple", "altar", "priest",
    "prophet", "king", "kingdom", "throne", "glory",
    "angel", "heaven", "judgment", "resurrection",
    "baptism", "blood", "cross", "crucified",
    "commandment", "law", "gospel", "promise",
    "blessing", "curse", "repentance", "sanctification",
    "justification", "propitiation", "mediator",
    "messiah", "anointed", "chosen", "elect",
    "tabernacle", "ark", "offering", "tithe",
    "passover", "sabbath", "feast", "circumcision",
    "tribulation", "wrath", "peace", "love",
    "worship", "prayer", "praise", "psalm",
    "creation", "created", "beginning", "eternal",
    "everlasting", "inheritance", "firstborn",
    "servant", "deliverer", "redeemer", "saviour",
}
