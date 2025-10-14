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
const FormCharacters = `[\\w'|#-]`;
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
  `^\/${MacroSymbolCharacters}(?:${FormPatternStr})?`,
  "g"
);
/**
 * Macros also require an extra pattern
 * for capturing optional arguments separately.
 * */
const MacroCapturePattern = RegExp(
  `(/${MacroSymbolCharacters})(${FormPatternStr})`
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
  [true, /^[mfn][mfn|/]*/g, BracketedDataType.GenderMarker],
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
  // Whitespace before an entry must be skipped.
  // Indentation levels for subentries are accounted for at the parser level.
  [false, /^\s+/g, EntryComponent.Delimiter],
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
  const argument = match[2].trim() || undefined;

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
  Omit<ParsedEntry, "raw" | "linenumber">
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
 * Processes main entries only (no subentries)
 * Returns well-formed entries and malformed blocks for manual correction
 */
function processMainEntriesOnly(blocks: EntryBlock[]): ProcessingResult {
  const wellFormed: ParsedEntry[] = [];
  const malformed: ProcessingResult["malformed"] = [];

  for (const block of blocks) {
    // For now, only process blocks WITHOUT subentries
    if (block.subEntries.length > 0) {
      // Skip blocks with subentries - they'll be handled later
      continue;
    }

    const parseResult = tryParseEntry(block.mainEntry, block.startLine);

    if (parseResult.success) {
      wellFormed.push(parseResult.entry);
    } else {
      malformed.push({
        block: block.mainEntry,
        startLine: block.startLine,
        endLine: block.endLine,
        error: parseResult.error,
      });
    }
  }

  return { wellFormed, malformed };
}

/**
 * Writes malformed entries to a file for manual correction
 */
function writeMalformedEntries(
  malformed: ProcessingResult["malformed"],
  outputPath: string
): void {
  const lines = malformed.map((item) => {
    return `% Line ${item.startLine}: ${item.error}\n${item.block}`;
  });

  fs.writeFileSync(outputPath, lines.join("\n\n"), "utf-8");
  console.log(`Wrote ${malformed.length} malformed entries to ${outputPath}`);
}

/**
 * Converts well-formed ParsedEntry objects to OntoLex format
 * Uses the extended addTypedForm() method for proper form classification
 */
function convertToOntoLex(entries: ParsedEntry[]): LexicalEntry[] {
  const lexicalEntries: LexicalEntry[] = [];

  for (const entry of entries) {
    if (!entry.headword) {
      // Skip entries without headwords (shouldn't happen if parser is correct)
      continue;
    }

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

    // Determine forms:
    // - spellingHint (in curly braces) is the canonical form if present
    // - text (outside braces) is the phonetic representation or also canonical if they coincide
    const canoncialSrc = entry.headword.spellingHint ?? entry.headword.text;
    const phoneticSrc = entry.headword.spellingHint
      ? entry.headword.text
      : undefined;

    // Transcribe both forms to Yiddish Unicode
    const canonicalTranscription = transcribeToYiddish(canoncialSrc);
    const phoneticTranscription = phoneticSrc
      ? transcribeToYiddish(phoneticSrc)
      : undefined;

    if (!canonicalTranscription.ok) {
      // If transcription fails, log error and skip this entry
      console.error(
        `Transcription error for "${canoncialSrc}": ${canonicalTranscription.error}`
      );
      continue;
    }
    if (phoneticTranscription && !phoneticTranscription.ok) {
      // If transcription fails, log error and skip this entry
      console.error(
        `Transcription error for "${phoneticSrc}": ${phoneticTranscription.error}`
      );
      continue;
    }

    const canonicalRep = canonicalTranscription.value;
    const phoneticRep = phoneticTranscription?.value;

    // Create the lexical entry builder with the Yiddish canonical form
    const builder = new LexicalEntryBuilder(
      canonicalRep,
      "yi", // Yiddish language code
      partOfSpeech
    );

    // If we have a separate romanization, add it with proper type classification
    if (phoneticSrc) {
      // Add the romanized form with explicit FormType.ROMANIZATION
      builder.addTypedForm(phoneticSrc, FormType.ROMANIZATION, undefined);
      // Add the phonetic spelling as an orthographic variant, admissible in the USSR
      if (phoneticRep) {
        builder.addTypedForm(phoneticRep, FormType.PHONETIC, undefined);
      }
    }
    // Otherwise pass through the untranscribed source
    else {
      builder.addTypedForm(canoncialSrc, FormType.ROMANIZATION, undefined);
    }

    // Process bracketed data
    for (const data of entry.bracketedData) {
      switch (data.type) {
        case BracketedDataType.Definition:
          // Extract definition text (remove "def: " prefix)
          const defMatch = data.content.match(/^def:\s*(.+)$/);
          if (defMatch) {
            builder.addSense(defMatch[1], "en");
          }
          break;

        case BracketedDataType.GenderMarker:
          // Set PoS
          partOfSpeech = PartOfSpeech.NOUN;
          // Parse gender (m/f/n)
          if (data.content === "m") {
            builder.addMorphologicalFeatures({ gender: [Gender.MASCULINE] });
          } else if (data.content === "f") {
            builder.addMorphologicalFeatures({ gender: [Gender.FEMININE] });
          } else if (data.content === "n") {
            builder.addMorphologicalFeatures({ gender: [Gender.NEUTER] });
          }
          break;

        case BracketedDataType.UsageNote:
        case BracketedDataType.GrammarNote:
          // Extract note text
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

    lexicalEntries.push(builder.build());
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

  console.log("Processing main entries (no subentries)...");
  const result = processMainEntriesOnly(blocks);
  console.log(`✓ ${result.wellFormed.length} well-formed entries`);
  console.log(`✗ ${result.malformed.length} malformed entries`);

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
      process.exit(1);
    });
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
