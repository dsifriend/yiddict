/**
 * @fileoverview Script to convert Rafael (Refoyl) Finkel's lexicon into JSON using the OntoLex model.
 */

import {
  Lexicon,
  LexicalEntry,
  LexiconBuilder,
  LexicalEntryBuilder,
  PartOfSpeech,
  FormType,
  Gender,
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
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Internal `Result` type for operations that can fail.
 * Provides type-safe error handling without exceptions.
 */
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

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
  [true, /^\t+[^\s%].*$/gm, LineCategory.SubEntry],
]);

// Knowing whether a string is between brackets or not is crucial for picking
// the right behavior for parsing an entry's syntax.
/** Surrounds its input w/ regex such that it will only match if between brackets. */
const bracketed = (inner: string) => `(?<=\\[)${inner}(?=\\])`;

/**
 * Refoyl uses a few characters outside the usual `A-Za-z` range
 * to encode his transliterated forms.
 */
const FormCharacters = `[\\w'|#-″ʼ_]`;
/**
 * Transliterated forms consist of a contiguous string of `FormCharacters`.
 */
const FormBaseStr = `${FormCharacters}+`;
/**
 * Transliterated forms with a spelling hint are followed
 * by another such string between curly braces, rarely separated
 * by whitespace inbetween.
 */
const FormPatternStr = `${FormBaseStr}(?:\\s*\{${FormBaseStr}\})?`;
/** Forms to be captured only occur after whitespace outside of brackets. */
const FormPattern = RegExp(`^${FormPatternStr}`, "g");
/**
 * Forms require an extra pattern in order to capture
 * transliterations and spellings in separate groups.
 * */
const FormCapturePattern = RegExp(
  `(${FormBaseStr})(?:\\s*\\{(${FormBaseStr})\\})?`
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
  NounJ = "/J", // Regular noun, indicates the noun refers to a person, usually Jewish
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
const MacroSymbolCharacters = "[ABCDEGHIJKLNPSTVX-]";
/**
 * This pattern matches a `MacroSymbol` with an optional argument.
 * It could be refined to only check for an argument after symbols
 * intended to take one, but in practice this is fine.
 */
const MacroPattern = RegExp(
  `^\/${MacroSymbolCharacters}(?:${FormPatternStr})?`,
  "g"
);
/**
 * Macros also require an extra pattern
 * for capturing optional arguments separately.
 * */
const MacroCapturePattern = RegExp(
  `(/${MacroSymbolCharacters})(${FormPatternStr})?`
);

/**
 * Refoyl encapsulates data that breaks with the Form and MacroSymbol syntax
 * between brackets. The type of data between brackets can be identified
 * by the first word used within the brackets. These are those data types.
 * They may be extended in the future.
 *
 * There's some overlap with data encoded using `MacroSymbols` as some of these
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
  [true, /^article/g, BracketedDataType.Article],
  [true, /^adj.*/g, BracketedDataType.Adjective],
  [true, /^adv.*/g, BracketedDataType.Adverb],
  [true, /^conj.*/g, BracketedDataType.Adverb],
  [true, /^interj/g, BracketedDataType.UsageNote],
  [true, /^d/g, BracketedDataType.Numeral],
  [true, /^participle/g, BracketedDataType.Participle],
  [true, /^prep/g, BracketedDataType.Preposition],
  [true, /^pronoun.*/g, BracketedDataType.Pronoun],
  [true, /^verb/g, BracketedDataType.Verb],
  // Other Grammar
  [true, /^[mfn?][mfn?|/]*/g, BracketedDataType.GenderMarker],
  // Morphology
  [true, /^prefix/g, BracketedDataType.Prefix],
  // Phonetics
  [true, /^pronunciation: .+/g, BracketedDataType.Pronunciation],
  // Semantics
  [true, /^def: .+/g, BracketedDataType.Definition],
  // Usage
  [true, /^clause/g, BracketedDataType.Clause],
  [true, /^connotations: .+/g, BracketedDataType.Connotations],
  [true, /^grammar: .+/g, BracketedDataType.GrammarNote],
  [true, /^idiom: .+/g, BracketedDataType.Idiom],
  [true, /^origin: .+/g, BracketedDataType.Origin],
  [true, /^(note|usage): .+/g, BracketedDataType.UsageNote],
]);
const GrammarNoteCapturePattern = new RegExp(`^grammar:\\s*(.+)$`);
const UsageNoteCapturePattern = new RegExp(`^(?:usage|note):\\s*(.+)$`);

/**
 * Categorization of `BracketedDataType` based on applicability to preceding form.
 *
 * Compare to `LOCAL_DATA_TYPES`.
 */
const SHARED_DATA_TYPES = new Set([
  BracketedDataType.Definition,
  BracketedDataType.Origin,
  BracketedDataType.UsageNote,
]);

/**
 * Categorization of `BracketedDataType` based on applicability to preceding form.
 *
 * Compare to `LOCAL_DATA_TYPES`.
 */
const LOCAL_DATA_TYPES = new Set([
  BracketedDataType.Article,
  BracketedDataType.Adjective,
  BracketedDataType.Adverb,
  BracketedDataType.Conjunction,
  BracketedDataType.Interjection,
  BracketedDataType.Numeral,
  BracketedDataType.Participle,
  BracketedDataType.Preposition,
  BracketedDataType.Pronoun,
  BracketedDataType.Verb,
  BracketedDataType.GenderMarker,
  BracketedDataType.Pronunciation,
  BracketedDataType.Prefix,
  BracketedDataType.Clause,
  BracketedDataType.Connotations,
  BracketedDataType.Idiom,
  BracketedDataType.GrammarNote,
]);

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
  Delimiter,
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
  // Whitespace before an entry must be skipped and treated as a delimeter.
  // Indentation levels for subentries are accounted for at the parser level.
  [false, /^[\s,]+/g, EntryComponent.Delimiter],
  // Headwords either begin an entry or are preceded by whitespace,
  // and crucially are not surrounded by brackets.
  [true, FormPattern, EntryComponent.Form],
  // Symbol components should match any `MacroSymbol` with an optional argument.
  [true, MacroPattern, EntryComponent.Symbol],
  // Bracketed data has different internal syntax, but the syntax to use
  // can always be identified by the first word it contains.
  [true, /^\[[^\[\]]+\]/g, EntryComponent.BracketedData],
  // Comments begin with a % and continue until the end of line.
  [true, /^%.*$/g, EntryComponent.Comment],
]);

/**
 * Transcribes ASCII-encoded Yiddish text to proper Unicode characters.
 *
 * @param asciiText - The ASCII-encoded text from the source file
 * @returns Result containing either the transcribed text or an error message
 *
 * @example
 * ```typescript
 * const result = transcribeToYiddish('shney');
 * if (result.ok) {
 *   console.log(result.value); // Should output: שנײ
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
function transcribeToYiddish(asciiText: string): Result<string> {
  // TODO: Implement actual transcription logic
  // This should map:
  // - sh -> ש
  // - n -> נ
  // - ey -> יי
  // etc.

  // NOTE: not documented…
  // Transcribe ʼ as a simple apostrophe: '
  // Transcribe _ as a simple space: ` `

  // For now, return the input unchanged as a placeholder
  // This allows the pipeline to work while transcription is being implemented
  return Ok(asciiText);

  // Future implementation should:
  // 1. Parse the ASCII according to Refoyl's encoding scheme
  // 2. Map each character/digraph to its Yiddish equivalent
  // 3. Handle special cases (like | for alternative endings)
  // 4. Return Err() if encoding is malformed
}

/**
 * Represents the separate pronunciation and spelling components
 * of a written word form.
 *
 * Despite the variable name "spellingHint", this contains
 * the CANONICAL form (content in curly braces like `{Sny}`)
 * while 'text' contains the ROMANIZATION (like `shney`).
 */
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
  indentLevel: number;
  subEntries?: ParsedEntry[];
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
    entryLine: string;
    lineNumber: number;
    error: string;
    parentEntry?: string;
  }[];
  skipped: {
    entryLine: string;
    lineNumber: number;
    reason: string;
    parentEntry?: string;
  }[];
}

/** Extracts form text and optional spelling hint from a form token. */
function parseForm(formText: string): ParsedForm {
  const match = formText.match(FormCapturePattern);
  if (!match) {
    return { text: formText };
  }
  return {
    text: match[1].trim(),
    spellingHint: match[2],
  };
}

/** Parses a macro symbol and its optional argument. */
function parseMacro(macroText: string): ParsedMacro | null {
  const match = macroText.match(MacroCapturePattern);
  if (!match) return null;

  const symbol = match[1] as MacroSymbol;
  const argument = match[2]?.trim() || undefined;

  return { symbol, argument };
}

/** Parses bracketed data by tokenizing its content. */
function parseBracketedData(bracketedText: string): ParsedBracketedData | null {
  // Remove brackets
  const content = bracketedText.slice(1, -1);

  // Tokenize the content
  const tokens = BracketedDataTokenizer.parse(content);
  if (!tokens) {
    return null;
  }

  return {
    type: tokens.kind,
    content: content,
    raw: bracketedText,
  };
}

/**
 * Parser for a Form token
 */
const formParser: Parser<EntryComponent, ParsedForm> = apply(
  tok(EntryComponent.Form),
  (token) => parseForm(token.text)
);

/**
 * Parser for a MacroSymbol token
 */
const macroParser: Parser<EntryComponent, ParsedMacro> = apply(
  tok(EntryComponent.Symbol),
  (token) => {
    const macro = parseMacro(token.text);
    if (!macro) {
      throw new Error(`Invalid macro: ${token.text}`);
    }
    return macro;
  }
);

/**
 * Parser for BracketedData token
 */
const bracketedParser: Parser<EntryComponent, ParsedBracketedData> = apply(
  tok(EntryComponent.BracketedData),
  (token) => {
    const parsed = parseBracketedData(token.text);
    if (!parsed) {
      throw new Error(`Invalid bracketed data: ${token.text}`);
    }
    return parsed;
  }
);

// TODO: reprogram to parse origin comments as "Origin" etc.
/**
 * Parser for optional comment at end of line
 */
const commentParser: Parser<EntryComponent, string> = apply(
  tok(EntryComponent.Comment),
  (token) => token.text.slice(1).trim() // Remove leading %
);

/**
 * Main entry parser
 * Structure: [Form] [Macro*] [BracketedData*] [Comment?]
 */
const entryParser: Parser<
  EntryComponent,
  Omit<ParsedEntry, "raw" | "linenumber" | "indentLevel" | "subEntries">
> = apply(
  seq(
    opt_sc(formParser),
    opt_sc(rep_sc(macroParser)),
    opt_sc(rep_sc(bracketedParser)),
    opt_sc(commentParser)
  ),
  ([headword, macros, bracketedData, comment]) => ({
    headword: headword || undefined,
    macros: macros || [],
    bracketedData: bracketedData || [],
    comment: comment || undefined,
  })
);

/**
 * Builds tree structure from flat list of parsed subentries
 * Returns root-level entries with nested children
 */
function buildSubentryTree(
  flatSubentries: Array<{ entry: ParsedEntry; lineNumber: number }>
): ParsedEntry[] {
  if (flatSubentries.length === 0) return [];

  const result: ParsedEntry[] = [];
  const stack: ParsedEntry[] = [];

  for (const { entry } of flatSubentries) {
    // Pop stack until we find the appropriate parent level
    while (
      stack.length > 0 &&
      stack[stack.length - 1].indentLevel >= entry.indentLevel
    ) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Root-level subentry (indent level 1)
      result.push(entry);
      stack.push(entry);
    } else {
      // Nested subentry - attach to parent
      const parent = stack[stack.length - 1];
      if (!parent.subEntries) parent.subEntries = [];
      parent.subEntries.push(entry);
      stack.push(entry);
    }
  }

  return result;
}

/**
 * Determines if a subentry should become a separate LexicalEntry
 * or an `otherForm` of the parent
 */
function shouldCreateSeparateEntry(subEntry: ParsedEntry): boolean {
  // Check for POS change indicators
  const hasPosChange = subEntry.macros.some((m) =>
    [
      MacroSymbol.Adjective,
      MacroSymbol.AdjectiveI,
      MacroSymbol.Verb,
      MacroSymbol.Noun,
      MacroSymbol.NounS,
      MacroSymbol.NounX,
    ].includes(m.symbol)
  );

  const hasPosInBrackets = subEntry.bracketedData.some((bd) =>
    [BracketedDataType.Adjective, BracketedDataType.Verb].includes(bd.type)
  );

  // Check for semantic indicators of separate entries
  const hasIdiom = subEntry.bracketedData.some(
    (bd) => bd.type === BracketedDataType.Idiom
  );

  const hasClause = subEntry.bracketedData.some(
    (bd) => bd.type === BracketedDataType.Clause
  );

  return hasPosChange || hasPosInBrackets || hasIdiom || hasClause;
}

/**
 * Generates headword for subentries that lack explicit headword
 * Uses parent headword + macro argument
 */
function generateSubentryHeadword(
  subEntry: ParsedEntry,
  parent: ParsedEntry
): string | null {
  // If subentry has explicit headword, use it
  if (subEntry.headword) {
    return subEntry.headword.text;
  }

  // Try to generate from parent + macro argument
  const parentForm = parent.headword?.text;
  if (!parentForm) return null;

  // Look for macro with argument (like /Garoyf)
  const macroWithArg = subEntry.macros.find((m) => m.argument);
  if (macroWithArg?.argument) {
    // PLACEHOLDER: Proper form generation logic needed
    // For now, just concatenate with underscore
    return `${parentForm}_${macroWithArg.argument}`;
  }

  // Can't generate - needs explicit headword
  return null;
}

/**
 * Reads the source file and splits it into entry blocks
 * Each block contains a main entry and its subentries
 */
function splitIntoBlocks(content: string): EntryBlock[] {
  const lines = content.split("\n");
  const blocks: EntryBlock[] = [];
  let currentBlock: EntryBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Tokenize the line to determine its category
    const token = LineCategorizer.parse(line);

    if (!token) {
      // Empty or comment line - skip
      continue;
    }

    if (token.kind === LineCategory.Entry) {
      // Start a new block
      if (currentBlock) {
        blocks.push(currentBlock);
      }

      currentBlock = {
        mainEntry: line,
        subEntries: [],
        startLine: lineNumber,
        endLine: lineNumber,
      };
    } else if (token.kind === LineCategory.SubEntry && currentBlock) {
      // Add to current block
      currentBlock.subEntries.push(line);
      currentBlock.endLine = lineNumber;
    }
  }

  // Final block
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

/**
 * Attempts to parse a single entry line
 * Returns ParsedEntry on success, or error message on failure
 */
function tryParseEntry(
  entryLine: string,
  lineNumber: number
): { success: true; entry: ParsedEntry } | { success: false; error: string } {
  try {
    // Extract indentation level (for subentries)
    const indentMatch = entryLine.match(/^(\t+)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // Tokenize the cleaned line
    const cleanLine = entryLine.trimStart();
    const tokens = EntryTokenizer.parse(cleanLine);

    if (!tokens) {
      return {
        success: false,
        error: "Failed to tokenize entry line",
      };
    }

    // Parse using the entryParser combinator
    const result = entryParser.parse(tokens);

    if (!result.successful) {
      return {
        success: false,
        error: `Parse failed at position ${result.error?.pos}: ${
          result.error?.message || "Unknown error"
        }`,
      };
    }

    // Construct the full ParsedEntry with metadata
    const parsedEntry: ParsedEntry = {
      ...result.candidates[0].result,
      raw: entryLine,
      linenumber: lineNumber,
      indentLevel: indent,
    };

    return { success: true, entry: parsedEntry };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Processes all entries including subentries
 * Returns well-formed entries with nested structure
 */
function processAllEntries(blocks: EntryBlock[]): ProcessingResult {
  const wellFormed: ParsedEntry[] = [];
  const malformed: ProcessingResult["malformed"] = [];
  const skipped: ProcessingResult["skipped"] = [];

  for (const block of blocks) {
    // Parse main entry
    const mainParseResult = tryParseEntry(block.mainEntry, block.startLine);

    let mainEntry: ParsedEntry;
    let parentCanonicalForm: string | undefined;

    if (!mainParseResult.success) {
      malformed.push({
        entryLine: block.mainEntry,
        lineNumber: block.startLine,
        error: mainParseResult.error,
      });
      continue; // Skip this entire block if main entry is malformed
    }

    mainEntry = mainParseResult.entry;
    parentCanonicalForm = mainEntry.headword?.text;

    // Parse all subentries (flat)
    const parsedSubentries: Array<{ entry: ParsedEntry; lineNumber: number }> =
      [];

    for (let i = 0; i < block.subEntries.length; i++) {
      const subLine = block.subEntries[i];
      const subLineNumber = block.startLine + i + 1;

      const subParseResult = tryParseEntry(subLine, subLineNumber);

      if (subParseResult.success) {
        parsedSubentries.push({
          entry: subParseResult.entry,
          lineNumber: subLineNumber,
        });
      } else {
        malformed.push({
          entryLine: subLine,
          lineNumber: subLineNumber,
          error: subParseResult.error,
          parentEntry: parentCanonicalForm,
        });
      }
    }

    // Build tree structure from flat subentries
    mainEntry.subEntries = buildSubentryTree(parsedSubentries);

    // Add to well-formed entries
    wellFormed.push(mainEntry);
  }

  return { wellFormed, malformed, skipped };
}

/**
 * Writes malformed entries to a file for manual correction
 */
function writeMalformedEntries(
  malformed: ProcessingResult["malformed"],
  outputPath: string
): void {
  const lines = malformed.map((item) => {
    const parent = item.parentEntry ? ` (parent: ${item.parentEntry})` : "";
    return `% Line ${item.lineNumber}${parent}: ${item.error}\n${item.entryLine}`;
  });
  fs.writeFileSync(outputPath, lines.join("\n\n"), "utf-8");
  console.log(`Wrote ${malformed.length} malformed entries to ${outputPath}`);
}

/**
 * Recursively converts parsed entries to OntoLex format
 * Handles both main entries and nested subentries
 */
function convertEntryWithSubentries(
  entry: ParsedEntry,
  parentEntry?: LexicalEntry
): LexicalEntry[] {
  const results: LexicalEntry[] = [];

  // Determine if this should be a separate entry or form
  const shouldBeSeparate = parentEntry
    ? shouldCreateSeparateEntry(entry)
    : true; // Main entries are always separate

  // Generate or get headword
  const headwordText =
    entry.headword?.text ||
    (parentEntry ? generateSubentryHeadword(entry, entry) : null);

  if (!headwordText) {
    // Skip entries without headwords
    // Still process nested subentries recursively
    if (entry.subEntries) {
      for (const subEntry of entry.subEntries) {
        results.push(...convertEntryWithSubentries(subEntry, parentEntry));
      }
    }
    return results;
  }

  if (shouldBeSeparate || !parentEntry) {
    // Create new LexicalEntry
    const builder = new LexicalEntryBuilder(headwordText, "yi");

    // Determine part of speech from macros
    let partOfSpeech: PartOfSpeech | undefined;
    for (const macro of entry.macros) {
      switch (macro.symbol) {
        case MacroSymbol.Noun:
        case MacroSymbol.NounS:
        case MacroSymbol.NounX:
        case MacroSymbol.NounProper:
          partOfSpeech = PartOfSpeech.NOUN;
          break;
        case MacroSymbol.Verb:
        case MacroSymbol.VerbT:
        case MacroSymbol.VerbB:
          partOfSpeech = PartOfSpeech.VERB;
          break;
        case MacroSymbol.Adjective:
        case MacroSymbol.AdjectiveK:
        case MacroSymbol.AdjectiveI:
          partOfSpeech = PartOfSpeech.ADJECTIVE;
          break;
        case MacroSymbol.Preposition:
          partOfSpeech = PartOfSpeech.PREPOSITION;
          break;
      }
    }

    if (partOfSpeech) {
      builder.addPartOfSpeech(partOfSpeech);
    }

    // Determine forms
    const canonicalSrc =
      entry.headword?.spellingHint ?? entry.headword?.text ?? headwordText;
    const phoneticSrc = entry.headword?.spellingHint
      ? entry.headword.text
      : undefined;

    // Transcribe forms
    const canonicalYiddish = transcribeToYiddish(canonicalSrc);
    if (canonicalYiddish.ok) {
      builder.setCanonicalWrittenReps([
        { value: canonicalYiddish.value, lang: "yi" },
      ]);
    }

    if (phoneticSrc) {
      builder.addTypedForm(phoneticSrc, FormType.ROMANIZATION);
    }

    // Process bracketed data
    for (const data of entry.bracketedData) {
      switch (data.type) {
        case BracketedDataType.Definition:
          const defMatch = data.content.match(/^def:\s*(.+)$/);
          if (defMatch) {
            builder.addSense(defMatch[1], "en");
          }
          break;

        case BracketedDataType.GenderMarker:
          // Set PoS
          partOfSpeech = PartOfSpeech.NOUN;
          // Parse gender (m/f/n)
          if (data.content.includes("m")) {
            builder.addMorphologicalFeatures({ gender: [Gender.MASCULINE] });
          }
          if (data.content.includes("f")) {
            builder.addMorphologicalFeatures({ gender: [Gender.FEMININE] });
          }
          if (data.content.includes("n")) {
            builder.addMorphologicalFeatures({ gender: [Gender.NEUTER] });
          }
          // Unknown gender marked with `?` is ignored/left ambiguous.
          break;

        case BracketedDataType.Origin:
          const originMatch = data.content.match(/^origin:\s*(.+)$/);
          if (originMatch) {
            builder.addEtymology(originMatch[1], "en");
          }
          break;

        case BracketedDataType.Pronunciation:
          const pronMatch = data.content.match(/^pronunciation:\s*(.+)$/);
          if (pronMatch) {
            builder.addTypedForm(pronMatch[1], FormType.PHONETIC);
          }
          break;

        case BracketedDataType.UsageNote:
        case BracketedDataType.GrammarNote:
          const noteMatch = data.content.match(
            /^(?:usage|note|grammar):\s*(.+)$/
          );
          if (noteMatch) {
            builder.addComment(noteMatch[1], "en");
          }
          break;
      }
    }

    // Add source comment if present
    if (entry.comment) {
      builder.addComment(`Source: ${entry.comment}`, "en");
    }

    // Add derivation note for subentries
    if (parentEntry) {
      builder.addComment(
        `Derived from: ${parentEntry.canonicalForm.writtenRep[0].value}`,
        "en"
      );
      // TODO: Add to etymology.derivedFrom when we have parent URI
    }

    const newEntry = builder.build();
    results.push(newEntry);

    // Process nested subentries recursively
    if (entry.subEntries) {
      for (const subEntry of entry.subEntries) {
        results.push(...convertEntryWithSubentries(subEntry, newEntry));
      }
    }
  } else {
    // PLACEHOLDER: Should add as otherForm to parent
    // TODO: Extract morphological features and add to parent's otherForms
    // For now, skip - form generation will be implemented later

    // Still process nested subentries
    if (entry.subEntries) {
      for (const subEntry of entry.subEntries) {
        results.push(...convertEntryWithSubentries(subEntry, parentEntry));
      }
    }
  }

  return results;
}

/**
 * Converts well-formed ParsedEntry objects to OntoLex format
 * Handles entries and all their subentries recursively
 */
function convertToOntoLex(entries: ParsedEntry[]): LexicalEntry[] {
  const lexicalEntries: LexicalEntry[] = [];

  for (const entry of entries) {
    lexicalEntries.push(...convertEntryWithSubentries(entry));
  }

  return lexicalEntries;
}

/**
 * Main processing function
 * Reads `refoyl` and outputs JSON and malformed entries
 */
async function processRefoylFile(
  inputPath: string,
  outputJsonPath: string,
  outputMalformedPath: string
): Promise<void> {
  console.log(`Reading ${inputPath}...`);
  const content = fs.readFileSync(inputPath, "utf-8");

  console.log("Splitting into entry blocks...");
  const blocks = splitIntoBlocks(content);
  console.log(`Found ${blocks.length} entry blocks`);

  console.log("Processing all entries (including subentries)...");
  const result = processAllEntries(blocks);

  const totalSubentries = result.wellFormed.reduce((sum, entry) => {
    const countAll = (e: ParsedEntry): number =>
      (e.subEntries?.length || 0) +
      (e.subEntries?.reduce((s, sub) => s + countAll(sub), 0) || 0);
    return sum + countAll(entry);
  }, 0);

  console.log(`✓ ${result.wellFormed.length} well-formed main entries`);
  console.log(`  └─ ${totalSubentries} subentries parsed`);
  console.log(`✗ ${result.malformed.length} malformed entries/subentries`);
  console.log(`⊘ ${result.skipped.length} skipped entries`);

  // Write malformed entries for manual correction
  if (result.malformed.length > 0) {
    writeMalformedEntries(result.malformed, outputMalformedPath);
  }

  // Convert to OntoLex format
  console.log("Converting to OntoLex format...");
  const lexicalEntries = convertToOntoLex(result.wellFormed);

  // Create lexicon
  const lexicon = new LexiconBuilder("yi", "Raphael Finkel's Yiddish Lexicon")
    .setCreator("Raphael Finkel")
    .setLicense("https://creativecommons.org/licenses/by-nc/3.0/us/")
    .build();

  // Add entries to lexicon
  for (const entry of lexicalEntries) {
    lexicon.entries.push(entry);
  }

  // Write JSON output
  fs.writeFileSync(outputJsonPath, JSON.stringify(lexicon, null, 2), "utf-8");
  console.log(`✓ Wrote JSON to ${outputJsonPath}`);
}

/**
 * Command-line interface for the parser
 * Allows running from terminal with arguments
 */
function main() {
  // process.argv contains: [node, script_path, ...user_args]
  const args = process.argv.slice(2);

  // Show help if no arguments or --help flag
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Refoyl Parser - Convert Refoyl's Yiddish lexicon into OntoLex format

Usage:
  node refoyl.js <input_file> [output_json] [output_malformed]
  ts-node refoyl.ts <input_file> [output_json] [output_malformed]

Arguments:
  input_file         Path to refoyl.txt (required)
  output_json        Path for JSON output (default: ./output/lexicon.json)
  output_malformed   Path for malformed entries (default: ./output/malformed.txt)

Examples:
  node refoyl.js ./refoyl.txt
  node refoyl.js ./refoyl.txt ./my-lexicon.json
  node refoyl.js ./refoyl.txt ./lexicon.json ./errors.txt
  ts-node refoyl.ts ./data/refoyl.txt ./output/pass1.json ./output/malformed-pass1.txt
    `);
    process.exit(0);
  }

  // Parse arguments
  const inputPath = args[0];
  const outputJsonPath = args[1] || "./output/lexicon.json";
  const outputMalformedPath = args[2] || "./output/malformed.txt";

  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputJsonPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const malformedDir = path.dirname(outputMalformedPath);
  if (!fs.existsSync(malformedDir)) {
    fs.mkdirSync(malformedDir, { recursive: true });
  }

  // Run the processor
  console.log("Starting Refoyl conversion...");
  console.log(`Input: ${inputPath}`);
  console.log(`Output JSON: ${outputJsonPath}`);
  console.log(`Output Malformed: ${outputMalformedPath}`);
  console.log("");

  processRefoylFile(inputPath, outputJsonPath, outputMalformedPath)
    .then(() => {
      console.log("");
      console.log("✓ Conversion complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("");
      console.error("✗ Conversion failed:", error.message);
      console.error("Stack trace:", error.stack);
      process.exit(1);
    });
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
