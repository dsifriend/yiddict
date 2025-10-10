/**
 * @fileoverview Script to convert Rafael (Refoyl) Finkel's lexicon into JSON using the OntoLex model.
 */

import {
  Lexicon,
  LexicalEntry,
  LexiconBuilder,
  LexicalEntryBuilder,
} from "@yiddict/lexicon";
import {
  seq,
  apply,
  opt_sc,
  rep_sc,
  tok,
  Parser,
  Token,
  buildLexer,
} from "typescript-parsec";

/**
 * Lines in Refoyl's source file can be categorized into four broad types:
 * - Empty lines
 *  - Appear empty and are ignored.
 * - Comment lines (starting with %)
 *  - Contain comments meant for other devs or Refoyl himself, also ignored.
 * - Entry lines (starting with a non-whitespace character)
 *  - Contain the main lexical entries, which are processed to create `LexicalEntry` objects.
 * - Sub-entry lines (beginning with one or more tab characters)
 *  - Generally represent some derived form, be it provided explicitly or derived from the main entry.
 */
enum LineCategory {
  Empty,
  Comment,
  Entry,
  SubEntry,
}
const LineCategorizer = buildLexer([
  [false, /^\s*$/gm, LineCategory.Empty],
  [false, /^\s*%.*$/gm, LineCategory.Comment],
  [true, /^\S.*$/gm, LineCategory.Entry],
  [true, /^\t[^\s%].*$/gm, LineCategory.SubEntry],
]);

// Knowing whether a string is between brackets or not is crucial for picking
// the right behavior for parsing an entry's syntax.
/** Surrounds its input w/ regex such that it won't match if between brackets. */
const unbracketed = (inner: string) => `(?<!\[[^\]]*)${inner}(?![^\[]*\])`;
/** Surrounds its input w/ regex such that it will only match if between brackets. */
const bracketed = (inner: string) => `(?<=\[)${inner}(?=\])`;

/**
 * Refoyl uses a few characters outside the usual `A-Za-z` range
 * to encode his transliterated forms.
 */
const FormCharacters = `[\w'|#-]`;
/**
 * Transliterated forms consist of a contiguous string of `FormCharacters`.
 */
const FormBaseStr = `${FormCharacters}+`;
/**
 * Transliterated forms with a spelling hint are followed
 * by another such string between curly braces, rarely separated
 * by whitespace inbetween.
 */
const FormPatternStr = `${FormBaseStr}(?:\s*\{${FormBaseStr}\})?`;
/** Forms to be captured only occur after whitespace outside of brackets. */
const FormPattern = RegExp(`(?<=^|\\s)${unbracketed(FormPatternStr)}`, "g");
/**
 * Forms require an extra pattern in order to capture
 * transliterations and spellings in separate groups.
 * */
const FormCapturePattern = RegExp(
  `^(${FormBaseStr})(?:\\s*\\{(${FormBaseStr})\\})?`
);

/**
 * Refoyl defines a set of so-called "codes" that are used to encode
 * linguistic data compactly. These codes are used in the entries
 * and sub-entries to indicate various grammatical features or forms.
 * The codes are typically prefixed with a slash (/) and can be followed
 * by additional information such as endings or forms.
 *
 * While we might expect all word class markers to be encoded as such,
 * they're not, instead relying on a different syntax entirely.
 * Other "codes" are rather used to instruct a transformer to generate
 * regular forms or perform other tasks dynamically, hence the name `MacroSymbol`.
 */
enum MacroSymbol {
  // Word-class markers
  Adjective = "/A", // Regular adjective
  AdjectiveK = "/K", // Gradable adjective. Takes an optional irregular form as argument
  AdjectiveI = "/I", // Takes a suffix as its argument to generate an adjective
  Noun = "/N", // Regular noun, plural in -n
  NounS = "/S", // Regular noun, plural in -s
  NounX = "/X", // Irregular noun, plural takes an alternative form as its argument
  NounProper = "/C", // Proper noun, takes the dative form
  NounDiminutive = "/D", // Generates diminutive forms of a noun. Takes an optional argument for irregular stems.
  Verb = "/V", // Regular verb
  VerbT = "/T", // Regular verb with unprefixed participle
  VerbB = "/B", // Regular verb with irregular participle
  VerbComplement = "/G", // Generate forms with the given adverbial complement.
  Preposition = "/P",
  // General Markers
  Prefix = "/L", // Indicates that the given prefix generates a valid form. Common for hebrew particles.
  Suffix = "/E", // Indicates that the given suffix generates a valid form. Primarily used for epenthetical -e- in otherwise regular plural forms.
  LoshnKoydesh = "/H", // Indicates a non-phonetic spelling, possibly, and usually for "loshn-koydesh" words. Superfluous with nearly no exceptions (<25)
  Spurious = "/-", // Indicates the given form (its argument) should NOT be generated if it otherwise would be.
}
/**
 * Although we define an individual token for every `MacroSymbol`,
 * it's still convenient to group these together at a higher level.
 */
const MacroSymbolCharacters = "[ABCDEGHIKLNPSTVX-]";
/**
 * This pattern matches a `MacroSymbol` with an optional argument.
 * It could be refined to only check for an argument after symbols
 * intended to take one, but in practice this is fine.
 */
const MacroPattern = RegExp(
  `/${MacroSymbolCharacters}(?:${FormPatternStr})?`,
  "g"
);
/**
 * Macros also require an extra pattern
 * for capturing optional arguments separately.
 * */
const MacroCapturePattern = RegExp(
  `^(/${MacroSymbolCharacters})(${FormPatternStr})`
);

/**
 * This pattern matches **anything** between unnested brackets.
 *
 * Refoyl encapsulates data that breaks with the Form and MacroSymbol syntax
 * between brackets. The type of data between brackets can be identified
 * by the first word used within the brackets.
 */
const BracketedPattern = RegExp(bracketed(`[^\[\]]+`), "g");
/**
 * These are the data types Refoyl encodes between brackets.
 * They may be extended in the future.
 *
 * There's some overlap with data encoded using `MacroSymbols` some of these
 * seem to have superceded their symbol versions over time.
 */
enum BracketedDataType {
  // Word-Class Markers
  Article,
  Adjective,
  Adverb,
  Conjunction,
  Interjection,
  Numeral,
  Participle,
  Preposition,
  Pronoun,
  Verb,
  // Other Grammar
  GenderMarker,
  // Morphology
  Prefix,
  // Phonetics
  Pronunciation,
  // Semantics
  Definition,
  // Usage
  Clause,
  Connotations,
  GrammarNote,
  Idiom,
  Origin,
  UsageNote,
}
const BracketedDataTokenizer = buildLexer([
  // Word-Classes
  [true, /article/, BracketedDataType.Article],
  [true, /adj.*/, BracketedDataType.Adjective],
  [true, /adv.*/, BracketedDataType.Adverb],
  [true, /conj.*/, BracketedDataType.Adverb],
  [true, /interj/, BracketedDataType.UsageNote],
  [true, /d/, BracketedDataType.Numeral],
  [true, /participle/, BracketedDataType.Participle],
  [true, /prep/, BracketedDataType.Preposition],
  [true, /pronoun.*/, BracketedDataType.Pronoun],
  [true, /verb/, BracketedDataType.Verb],
  // Other Grammar
  [true, /[mfn][mfn|/]*/, BracketedDataType.GenderMarker],
  // Morphology
  [true, /prefix/, BracketedDataType.Prefix],
  // Phonetics
  [true, /pronunciation: .+/, BracketedDataType.Pronunciation],
  // Semantics
  [true, /def: .+/, BracketedDataType.Definition],
  // Usage
  [true, /clause/, BracketedDataType.Clause],
  [true, /connotations: .+/, BracketedDataType.Connotations],
  [true, /grammar: .+/, BracketedDataType.GrammarNote],
  [true, /idiom: .+/, BracketedDataType.Idiom],
  [true, /origin: .+/, BracketedDataType.Origin],
  [true, /(note|usage): .+/, BracketedDataType.UsageNote],
]);
const GrammarNoteCapturePattern = new RegExp(`^grammar:\\s*(.+)$`);
const UsageNoteCapturePattern = new RegExp(`^(?:usage|note):\\s*(.+)$`);

/**
 * Entries in Refoyl's source files are composed of three main parts:
 * 1. The `Form` for an entry, possibly including some spelling annotation.
 * 2. Any `MacroSymbol`s and their arguments, and
 * 3. More freeform linguistic data, ending with a definition and optionally a comment.
 *
 * Subentries are structured similarly, though their headword may be implicit
 * (generated from their parent entry as a result of a `MacroSymbol`).
 *
 * No component is strictly necessary in every entry,
 * but every entry must contain at least one of them.
 */
enum EntryComponent {
  Form,
  Symbol,
  BracketedData,
  Comment,
}
/**
 * The definitions for `EntryTokenizer` attempt to be as strict as possible,
 * but may be slightly more general than the component names suggest,
 * because the extra data is required for further processing.
 *
 * For example: the use of `|` to record optional or alternative endings
 * without actually encoding them as new entries etc.
 */
const EntryTokenizer = buildLexer([
  // Headwords either begin an entry or are preceded by whitespace,
  // and crucially are not surrounded by brackets.
  [true, FormPattern, EntryComponent.Form],
  // Symbol components should match any `MacroSymbol` with an optional argument.
  [true, MacroPattern, EntryComponent.Symbol],
  // Bracketed data has different internal syntax, but the syntax to use
  // can always be identified by the first word it contains.
  [true, /\[[^\[\]]+\]/g, EntryComponent.BracketedData],
  // Comments begin with a % and continue until the end of line.
  [true, /%.*$/, EntryComponent.Comment],
]);

interface ParsedForm {
  text: string;
  spellingHint?: string;
}

interface ParsedMacro {
  symbol: MacroSymbol;
  argument?: string;
}

/**
 * The "raw" form of bracketed data may be necessary during conversion.
 */
interface ParsedBracketedData {
  type: BracketedDataType;
  content: string;
  raw: string;
}

/**
 * The "raw" form of an entry may be useful during debugging.
 * Likewise its linenumber within the source file.
 */
interface ParsedEntry {
  headword?: ParsedForm;
  macros: ParsedMacro[];
  bracketedData: ParsedBracketedData[];
  comment?: string;
  raw: string;
  linenumber: number;
}

/**
 * Greatest unit of separation within the source file.
 *
 * Entries aren't converted until the block they belong to
 * have been correctly parsed in their entirety.
 */
interface EntryBlock {
  mainEntry: string;
  subEntries: string[];
  startLine: number;
  endLine: number;
}

/**
 * Because not all entries are necessarily well formed in the source file,
 * they're reggurgitated in order to be manually inspected, corrected,
 * and finally parsed during a new pass.
 */
interface ProcessingResult {
  wellFormed: ParsedEntry[];
  malformed: {
    block: string;
    startLine: number;
    endLine: number;
    error: string;
  }[];
}
