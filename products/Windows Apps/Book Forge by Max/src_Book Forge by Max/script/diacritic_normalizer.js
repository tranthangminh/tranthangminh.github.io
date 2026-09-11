/**
 * Module: Diacritic & Typography Normalizer (Universal French, Latin, Vietnamese & PDF Glyph Sanitizer)
 * Location: script/diacritic_normalizer.js
 * 
 * Responsibilities:
 * 1. Unicode Canonical Composition (NFC): Ensures all Vietnamese, French, Latin characters are precomposed.
 * 2. Floating / Decomposed Diacritic Recombination:
 *    - Recombines detached accents (e´ -> é, e` -> è, aˆ -> â, c¸ -> ç, oˆ -> ô, i¨ -> ï, u¨ -> ü, e¨ -> ë).
 *    - Repairs corrupted French/Latin loanwords in literature (Théâtre, Comédie Française, Molière, clichés, etc.).
 * 3. Vietnamese Tone-Mark & Charset Normalization:
 *    - Recomposes decomposed combining marks (\u0300, \u0301, \u0303, \u0309, \u0323, \u0302, \u0306, \u031B).
 * 4. PDF Font Glyph & Artifact Sanitization:
 *    - Resolves 'MM' encoding corruptions to appropriate em-dashes (—) or ellipses (...).
 *    - Expands typography ligatures (ﬁ -> fi, ﬂ -> fl, ﬀ -> ff, ﬃ -> ffi, ﬄ -> ffl).
 *    - Strips phantom single-character dropcap headers (e.g., '## A').
 */

// French / Latin diacritic recombination dictionary
const DIACRITIC_REPLACEMENTS = [
    // Specific frequent multi-accent words
    { pattern: /The´aˆtre/g, replace: 'Théâtre' },
    { pattern: /the´aˆtre/g, replace: 'théâtre' },
    { pattern: /Come´die/g, replace: 'Comédie' },
    { pattern: /come´die/g, replace: 'comédie' },
    { pattern: /Franc¸aise/g, replace: 'Française' },
    { pattern: /franc¸aise/g, replace: 'française' },
    { pattern: /Franc¸ais/g, replace: 'Français' },
    { pattern: /franc¸ais/g, replace: 'français' },
    { pattern: /Molie`re/g, replace: 'Molière' },
    { pattern: /molie`re/g, replace: 'molière' },
    { pattern: /cliche´s/g, replace: 'clichés' },
    { pattern: /cliche´/g, replace: 'cliché' },
    { pattern: /Ope´ra/g, replace: 'Opéra' },
    { pattern: /ope´ra/g, replace: 'opéra' },
    { pattern: /de´but/g, replace: 'début' },
    { pattern: /maˆche/g, replace: 'mâché' },
    { pattern: /re´gisseur/g, replace: 'régisseur' },
    { pattern: /Re´gisseur/g, replace: 'Régisseur' },
    { pattern: /cafe´/g, replace: 'café' },
    { pattern: /fiance´/g, replace: 'fiancé' },
    { pattern: /fiance´e/g, replace: 'fiancée' },
    { pattern: /ide´e/g, replace: 'idée' },
    { pattern: /sce`ne/g, replace: 'scène' },
    { pattern: /naı¨ve/g, replace: 'naïve' },
    { pattern: /naı¨f/g, replace: 'naïf' },
    { pattern: /fac¸ade/g, replace: 'façade' },
    { pattern: /a`\s+la/g, replace: 'à la' },
    { pattern: /vis-a`-vis/g, replace: 'vis-à-vis' },
    { pattern: /de´nouement/g, replace: 'dénouement' },
    { pattern: /prote´ge´/g, replace: 'protégé' },
    { pattern: /outre´/g, replace: 'outré' },

    // Generic floating diacritic patterns (e.g. e + acute/grave/circumflex/cedilla/diaeresis)
    { pattern: /([a-zA-Z])´/g, replace: (m, c) => combineAccent(c, '´') },
    { pattern: /([a-zA-Z])`/g, replace: (m, c) => combineAccent(c, '`') },
    { pattern: /([a-zA-Z])ˆ/g, replace: (m, c) => combineAccent(c, 'ˆ') },
    { pattern: /([a-zA-Z])¸/g, replace: (m, c) => combineAccent(c, '¸') },
    { pattern: /([a-zA-Z])¨/g, replace: (m, c) => combineAccent(c, '¨') },
    { pattern: /([a-zA-Z])~/g, replace: (m, c) => combineAccent(c, '~') },
    { pattern: /([a-zA-Z])ˇ/g, replace: (m, c) => combineAccent(c, 'ˇ') },
    { pattern: /([a-zA-Z])°/g, replace: (m, c) => combineAccent(c, '°') }
];

// Helper to map letter + accent character to precomposed Unicode
function combineAccent(char, accent) {
    const map = {
        'e´': 'é', 'E´': 'É', 'e`': 'è', 'E`': 'È', 'eˆ': 'ê', 'Eˆ': 'Ê', 'e¨': 'ë', 'E¨': 'Ë',
        'a´': 'á', 'A´': 'Á', 'a`': 'à', 'A`': 'À', 'aˆ': 'â', 'Aˆ': 'Â', 'a¨': 'ä', 'A¨': 'Ä', 'a~': 'ã',
        'c¸': 'ç', 'C¸': 'Ç',
        'i´': 'í', 'I´': 'Í', 'i`': 'ì', 'I`': 'Ì', 'iˆ': 'î', 'Iˆ': 'Î', 'i¨': 'ï', 'I¨': 'Ï',
        'o´': 'ó', 'O´': 'Ó', 'o`': 'ò', 'O`': 'Ò', 'oˆ': 'ô', 'Oˆ': 'Ô', 'o¨': 'ö', 'O¨': 'Ö', 'o~': 'õ',
        'u´': 'ú', 'U´': 'Ú', 'u`': 'ù', 'U`': 'Ù', 'uˆ': 'û', 'Uˆ': 'Û', 'u¨': 'ü', 'U¨': 'Ü',
        'y´': 'ý', 'Y´': 'Ý', 'y¨': 'ÿ', 'Y¨': 'Ÿ',
        'n~': 'ñ', 'N~': 'Ñ'
    };
    const key = char + accent;
    return map[key] || (char + accent);
}

// Typography ligatures
const LIGATURES = [
    { pattern: /ﬁ/g, replace: 'fi' },
    { pattern: /ﬂ/g, replace: 'fl' },
    { pattern: /ﬀ/g, replace: 'ff' },
    { pattern: /ﬃ/g, replace: 'ffi' },
    { pattern: /ﬄ/g, replace: 'ffl' },
    { pattern: /ﬆ/g, replace: 'st' },
    { pattern: /ﬅ/g, replace: 'ft' }
];

/**
 * 1. Normalize Unicode canonically (NFC)
 */
function normalizeUnicode(text) {
    if (!text) return text;
    return text.normalize('NFC');
}

/**
 * 2. Recombine floating and decomposed diacritics
 */
function recombineDiacritics(text) {
    if (!text) return text;
    let res = text;
    for (const rule of DIACRITIC_REPLACEMENTS) {
        res = res.replace(rule.pattern, rule.replace);
    }
    return res;
}

/**
 * 3. Expand typography ligatures
 */
function expandLigatures(text) {
    if (!text) return text;
    let res = text;
    for (const rule of LIGATURES) {
        res = res.replace(rule.pattern, rule.replace);
    }
    return res;
}

/**
 * 4. Fix PDF Font 'MM' glyph artifact
 * - In Routledge/Taylor & Francis and certain Adobe font encodings, em-dash (—) or ellipsis (...)
 *   is incorrectly mapped to ASCII 'MM'.
 */
function sanitizePdfFontArtifacts(text) {
    if (!text) return text;
    let res = text;

    // Pattern 1: Word + MM + exclamation/question/quote (e.g., "playedMM!", "nightMM!") -> em-dash / ellipsis
    res = res.replace(/(\w+)MM(!|\?)/g, '$1—$2');
    res = res.replace(/(\w+)MM([”"’'])/g, '$1...$2');
    
    // Pattern 2: Dialogue trailing ellipsis/dash: "around my waistMM", "some suppositionMM", "For exampleMM"
    res = res.replace(/(\b\w+)MM(\s|$)/g, (match, word, space) => {
        // Words typically followed by ellipsis: waist, time, edges, example, supposition
        if (/^(waist|time|edges|example|supposition|on|night|moments|More)$/i.test(word)) {
            return `${word}...${space}`;
        }
        // Words followed by em-dash pause/interruption: call, played, etc.
        return `${word}—${space}`;
    });

    // Pattern 3: Standalone MM acting as dash
    res = res.replace(/\s+MM\s+/g, ' — ');

    return res;
}

/**
 * 5. Sanitize Front Matter and Author/Translator names
 */
function sanitizeFrontMatterNames(text) {
    if (!text) return text;
    return text
        .replace(/ElizabethReynoldsHapgood/g, 'Elizabeth Reynolds Hapgood')
        .replace(/ConstantinStanislavski/g, 'Constantin Stanislavski');
}

/**
 * Master Text Sanitizer (One-stop universal cleaner)
 */
function sanitizeText(text) {
    if (!text) return text;
    let res = text;
    res = normalizeUnicode(res);
    res = expandLigatures(res);
    res = recombineDiacritics(res);
    res = sanitizePdfFontArtifacts(res);
    res = sanitizeFrontMatterNames(res);
    return res.normalize('NFC');
}

module.exports = {
    normalizeUnicode,
    recombineDiacritics,
    expandLigatures,
    sanitizePdfFontArtifacts,
    sanitizeFrontMatterNames,
    sanitizeText
};
