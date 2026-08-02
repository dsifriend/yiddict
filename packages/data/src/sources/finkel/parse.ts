import type {
  FinkelEntryActionDict,
  FinkelEntrySemantics,
} from "./parser/entry.ohm-bundle";
import ENTRY_GRAMMAR from "./parser/entry.ohm-bundle";
import type {
  FinkelBracketActionDict,
  FinkelBracketSemantics,
} from "./parser/bracket.ohm-bundle";
import BRACKET_GRAMMAR from "./parser/bracket.ohm-bundle";

export const DEFAULT_FINKEL_SOURCE_PATH = new URL("./upstream/refoyl.txt", import.meta.url);

export type LineCategory = "empty" | "comment" | "entry" | "subentry";

export interface SourceLine {
  lineNumber: number;
  text: string;
  category: LineCategory;
  indentLevel: number;
}

export interface ParsedForm {
  romanized: string;
  spellingAnnotation?: string;
}

export interface ParsedMacro {
  symbol: string;
  argument?: ParsedForm;
}

export type BracketedDataKind =
  | "article"
  | "adjective"
  | "adverb"
  | "conjunction"
  | "interjection"
  | "numeral"
  | "participle"
  | "particle"
  | "preposition"
  | "pronoun"
  | "verb"
  | "noun"
  | "gender-marker"
  | "prefix"
  | "pronunciation"
  | "definition"
  | "clause"
  | "connotations"
  | "grammar-note"
  | "idiom"
  | "origin"
  | "usage-note";

export interface ParsedBracketedData {
  kind: BracketedDataKind;
  raw: string;
  value?: string;
}

export type EntryComponent =
  | { type: "form"; form: ParsedForm }
  | { type: "macro"; macro: ParsedMacro }
  | { type: "bracketed-data"; data: ParsedBracketedData };

/**
 * Unified shape for both top-level entries and subentries.
 * Top-level entries always have indentLevel = 0.
 */
export interface ParsedEntry {
  lineNumber: number;
  indentLevel: number;
  raw: string;
  components: EntryComponent[];
  trailingComment?: string;
}

export interface ParsedBlock {
  entries: ParsedEntry[];
}

export interface ParseStats {
  lineCount: number;
  emptyLineCount: number;
  commentLineCount: number;
  entryLineCount: number;
  subentryLineCount: number;
  blockCount: number;
}

export interface ParsedFinkelSource {
  sourcePath: string;
  stats: ParseStats;
  blocks: ParsedBlock[];
  errors: FinkelParseError[];
}

export class FinkelParseError extends Error {
  constructor(
    message: string,
    readonly sourcePath: string,
    readonly line: number,
    readonly column: number,
    readonly lineText: string,
  ) {
    super(
      `${sourcePath}:${line}:${column} ${message}\n${lineText}\n${" ".repeat(Math.max(0, column - 1))}^`,
    );
    this.name = "FinkelParseError";
  }
}

class BracketParseError extends Error {
  constructor(
    message: string,
    readonly innerColumn: number,
  ) {
    super(message);
    this.name = "BracketParseError";
  }
}

class BracketDataNodeError extends Error {
  constructor(
    readonly entryStartIndex: number,
    readonly innerColumn: number,
    message: string,
  ) {
    super(message);
    this.name = "BracketDataNodeError";
  }
}

type EntryAst = { components: EntryComponent[]; trailingComment?: string };
type FormChunkAst = { base: string; spellingAnnotation?: string };

type NodeWithAst<T> = { ast: () => T };
type NodeWithText = { sourceString: string };
type NodeWithChildren = { children: unknown[] };

function asAstNode<T>(node: unknown): NodeWithAst<T> {
  return node as NodeWithAst<T>;
}

function nodeText(node: unknown): string {
  return (node as NodeWithText).sourceString;
}

function hasChildren(node: unknown): node is NodeWithChildren {
  return Array.isArray((node as NodeWithChildren).children);
}

function textValue(textNode: unknown): string {
  return nodeText(textNode).trim();
}

function optionalChildAst<T>(node: unknown): T | undefined {
  if (!hasChildren(node) || node.children.length === 0) {
    return undefined;
  }

  return asAstNode<T>(node.children[0]).ast();
}

const entrySemantics: FinkelEntrySemantics = ENTRY_GRAMMAR.createSemantics();
const bracketSemantics: FinkelBracketSemantics = BRACKET_GRAMMAR.createSemantics();

function parseBracketData(innerText: string): ParsedBracketedData {
  const match = BRACKET_GRAMMAR.match(innerText, "Content");

  if (match.failed()) {
    const position = match.getRightmostFailurePosition();
    throw new BracketParseError(`Invalid bracketed data: ${match.shortMessage}`, position + 1);
  }

  return bracketSemantics(match).ast() as ParsedBracketedData;
}

const entryAstActions: FinkelEntryActionDict<unknown> = {
  entryLine(_d1, sequence, _d2, trailingComment) {
    const components = asAstNode<EntryComponent[]>(sequence).ast();
    const comment = optionalChildAst<string>(trailingComment);
    return { components, trailingComment: comment } satisfies EntryAst;
  },

  sequence(first, _delims, rest) {
    const firstNode = first as unknown as { ast: () => EntryComponent };
    const restNode = rest as unknown as { children: Array<{ ast: () => EntryComponent }> };

    const components: EntryComponent[] = [firstNode.ast()];
    for (const componentNode of restNode.children) {
      components.push(componentNode.ast());
    }
    return components;
  },

  component(component) {
    return asAstNode<EntryComponent>(component).ast();
  },

  form(chunks) {
    const chunkNodes = (chunks as NodeWithChildren).children ?? [];
    const chunkAsts = chunkNodes.map((node) => asAstNode<FormChunkAst>(node).ast());

    return {
      type: "form",
      form: {
        romanized: chunkAsts.map((chunk) => chunk.base).join(""),
        spellingAnnotation: chunkAsts.find((chunk) => chunk.spellingAnnotation !== undefined)
          ?.spellingAnnotation,
      },
    } satisfies EntryComponent;
  },

  formChunk(base, formSpelling) {
    return {
      base: nodeText(base),
      spellingAnnotation: optionalChildAst<string>(formSpelling),
    } satisfies FormChunkAst;
  },

  formSpelling(_ws, _open, base, _close) {
    return nodeText(base);
  },

  macro(_slash, symbols, macroArgument) {
    const argument = optionalChildAst<ParsedForm>(macroArgument);
    return {
      type: "macro",
      macro: {
        symbol: `/${nodeText(symbols)}`,
        argument,
      },
    } satisfies EntryComponent;
  },

  macroArgument(_ws, form) {
    const component = asAstNode<EntryComponent>(form).ast();
    if (component.type !== "form") {
      throw new Error("Internal parse error: macro argument was not parsed as a form");
    }
    return component.form;
  },

  bracketedData(_open, inner, _close) {
    const thisNode = this as unknown as { source: { startIdx: number } };

    try {
      return {
        type: "bracketed-data",
        data: parseBracketData(nodeText(inner)),
      } satisfies EntryComponent;
    } catch (error) {
      if (error instanceof BracketParseError) {
        throw new BracketDataNodeError(thisNode.source.startIdx, error.innerColumn, error.message);
      }

      throw error;
    }
  },

  trailingComment(_delim, _percent, text) {
    return nodeText(text);
  },
};

const bracketAstActions: FinkelBracketActionDict<unknown> = {
  Content(value) {
    return asAstNode<ParsedBracketedData>(value).ast();
  },

  Article(_keyword) {
    return { kind: "article", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Adjective(_keyword, _rest) {
    return { kind: "adjective", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Adverb(_keyword, _rest) {
    return { kind: "adverb", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Conjunction(_keyword, _rest) {
    return { kind: "conjunction", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Interjection(_keyword) {
    return { kind: "interjection", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Noun(_keyword, _rest) {
    return { kind: "noun", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Numeral(_keyword, _end) {
    return { kind: "numeral", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Participle(_keyword) {
    return { kind: "participle", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Particle(_keyword) {
    return { kind: "particle", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Preposition(_keyword) {
    return { kind: "preposition", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Pronoun(_keyword, _rest) {
    return { kind: "pronoun", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Verb(_keyword) {
    return { kind: "verb", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  GenderMarker(_head, _tail, _end) {
    return {
      kind: "gender-marker",
      raw: this.sourceString,
      value: this.sourceString,
    } satisfies ParsedBracketedData;
  },
  Prefix(_keyword) {
    return { kind: "prefix", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Pronunciation(_prefix, _ws, text) {
    return {
      kind: "pronunciation",
      raw: this.sourceString,
      value: textValue(text),
    } satisfies ParsedBracketedData;
  },
  Definition(_prefix, _ws, text) {
    return {
      kind: "definition",
      raw: this.sourceString,
      value: textValue(text),
    } satisfies ParsedBracketedData;
  },
  Clause(_keyword) {
    return { kind: "clause", raw: this.sourceString } satisfies ParsedBracketedData;
  },
  Connotations(_prefix, _ws, text) {
    return {
      kind: "connotations",
      raw: this.sourceString,
      value: textValue(text),
    } satisfies ParsedBracketedData;
  },
  GrammarNote(_prefix, _ws, text) {
    return {
      kind: "grammar-note",
      raw: this.sourceString,
      value: textValue(text),
    } satisfies ParsedBracketedData;
  },
  Idiom(_prefix, _ws, text) {
    return {
      kind: "idiom",
      raw: this.sourceString,
      value: textValue(text),
    } satisfies ParsedBracketedData;
  },
  Origin(_prefix, _ws, text) {
    return {
      kind: "origin",
      raw: this.sourceString,
      value: textValue(text),
    } satisfies ParsedBracketedData;
  },
  UsageNote(_prefix, _ws, text) {
    return {
      kind: "usage-note",
      raw: this.sourceString,
      value: textValue(text),
    } satisfies ParsedBracketedData;
  },
};

entrySemantics.addOperation("ast", entryAstActions);
bracketSemantics.addOperation("ast", bracketAstActions);

function classifyLine(line: string): { category: LineCategory; indentLevel: number } | null {
  if (/^\s*$/.test(line)) {
    return { category: "empty", indentLevel: 0 };
  }

  if (/^\s*%.*$/.test(line)) {
    return { category: "comment", indentLevel: 0 };
  }

  if (/^\S.*$/.test(line)) {
    return { category: "entry", indentLevel: 0 };
  }

  const subentryMatch = /^(\t+)[^\s%].*$/.exec(line);
  if (subentryMatch) {
    const indent = subentryMatch[1] ?? "";
    return { category: "subentry", indentLevel: indent.length };
  }

  return null;
}

/**
 * Parse one line of entry/subentry content (without leading subentry tabs).
 */
function parseEntryContent(
  lineText: string,
  lineNumber: number,
  sourcePath: string,
): EntryAst {
  const match = ENTRY_GRAMMAR.match(lineText, "entryLine");

  if (match.failed()) {
    const position = match.getRightmostFailurePosition();
    const column = Math.max(1, position + 1);

    throw new FinkelParseError(
      `Invalid entry syntax: ${match.shortMessage}`,
      sourcePath,
      lineNumber,
      column,
      lineText,
    );
  }

  try {
    return entrySemantics(match).ast() as EntryAst;
  } catch (error) {
    if (error instanceof BracketDataNodeError) {
      const bracketContentColumn = error.entryStartIndex + 1 + error.innerColumn;
      throw new FinkelParseError(
        error.message,
        sourcePath,
        lineNumber,
        bracketContentColumn,
        lineText,
      );
    }

    throw error;
  }
}

/**
 * Build blocks as: one top-level entry (indent 0) plus subsequent subentries.
 * Every parsed item is normalized to the same ParsedEntry shape.
 * Errors are collected and returned rather than thrown; problematic lines are skipped.
 */
function groupBlocks(
  lines: SourceLine[],
  sourcePath: string,
): { blocks: ParsedBlock[]; errors: FinkelParseError[] } {
  const blocks: ParsedBlock[] = [];
  const errors: FinkelParseError[] = [];
  let currentBlock: ParsedBlock | "failed" | undefined;

  for (const line of lines) {
    if (line.category === "empty" || line.category === "comment") {
      continue;
    }

    if (line.category === "entry") {
      let ast: EntryAst;
      try {
        ast = parseEntryContent(line.text, line.lineNumber, sourcePath);
      } catch (error) {
        if (error instanceof FinkelParseError) {
          errors.push(error);
          currentBlock = "failed";
          continue;
        }
        throw error;
      }

      const mainEntry: ParsedEntry = {
        lineNumber: line.lineNumber,
        indentLevel: 0,
        raw: line.text,
        components: ast.components,
        trailingComment: ast.trailingComment,
      };

      currentBlock = { entries: [mainEntry] };
      blocks.push(currentBlock);
      continue;
    }

    // Subentry handling
    if (currentBlock === undefined) {
      errors.push(
        new FinkelParseError(
          "Subentry encountered before any entry block",
          sourcePath,
          line.lineNumber,
          1,
          line.text,
        ),
      );
      continue;
    }

    if (currentBlock === "failed") {
      // Silently skip subentries belonging to a failed entry block.
      continue;
    }

    const contentWithoutIndent = line.text.slice(line.indentLevel);
    let ast: EntryAst;
    try {
      ast = parseEntryContent(contentWithoutIndent, line.lineNumber, sourcePath);
    } catch (error) {
      if (error instanceof FinkelParseError) {
        errors.push(error);
        continue;
      }
      throw error;
    }

    // Subentries can carry their own trailing comments; we preserve them here.
    const subentry: ParsedEntry = {
      lineNumber: line.lineNumber,
      indentLevel: line.indentLevel,
      raw: contentWithoutIndent,
      components: ast.components,
      trailingComment: ast.trailingComment,
    };

    currentBlock.entries.push(subentry);
  }

  return { blocks, errors };
}

/**
 * Full source parser pipeline:
 * 1) classify raw lines,
 * 2) parse entry/subentry content with Ohm,
 * 3) group into entry blocks and return aggregate stats.
 */
export function parseFinkelText(text: string, sourcePath = "<inline>"): ParsedFinkelSource {
  const rawLines = text.split(/\r?\n/);

  const lineResults: (SourceLine | FinkelParseError)[] = rawLines.map((line, index) => {
    const lineNumber = index + 1;
    const classification = classifyLine(line);

    if (!classification) {
      return new FinkelParseError(
        "Line does not match any valid DSL line category",
        sourcePath,
        lineNumber,
        1,
        line,
      );
    }

    return {
      lineNumber,
      text: line,
      category: classification.category,
      indentLevel: classification.indentLevel,
    };
  });

  const classifyErrors = lineResults.filter((r): r is FinkelParseError => r instanceof FinkelParseError);
  const lines = lineResults.filter((r): r is SourceLine => !(r instanceof FinkelParseError));

  const stats: ParseStats = {
    lineCount: lines.length,
    emptyLineCount: lines.filter((line) => line.category === "empty").length,
    commentLineCount: lines.filter((line) => line.category === "comment").length,
    entryLineCount: lines.filter((line) => line.category === "entry").length,
    subentryLineCount: lines.filter((line) => line.category === "subentry").length,
    blockCount: 0,
  };

  const { blocks, errors: blockErrors } = groupBlocks(lines, sourcePath);
  stats.blockCount = blocks.length;

  const errors = [...classifyErrors, ...blockErrors].sort((a, b) => a.line - b.line);

  for (const error of errors) {
    console.error(error.message);
  }

  return {
    sourcePath,
    stats,
    blocks,
    errors,
  };
}

const PARSE_ERROR_LOG_PATH = new URL("./parse-errors.log", import.meta.url);

export async function writeParseErrorLog(
  result: ParsedFinkelSource,
  logPath: URL = PARSE_ERROR_LOG_PATH,
): Promise<void> {
  if (result.errors.length === 0) {
    return;
  }

  const lines = [
    `Parse errors for: ${result.sourcePath}`,
    `${result.errors.length} error(s) on ${new Date().toISOString()}`,
    "",
    ...result.errors.map((e) => e.message),
  ];

  await Bun.write(logPath, lines.join("\n") + "\n");
}

export async function parseFinkelSourceFromFile(
  sourceUrl: URL = DEFAULT_FINKEL_SOURCE_PATH,
): Promise<ParsedFinkelSource> {
  const file = Bun.file(sourceUrl);

  if (!(await file.exists())) {
    throw new Error(`Finkel source file does not exist: ${sourceUrl.pathname}`);
  }

  const text = await file.text();
  const result = parseFinkelText(text, sourceUrl.pathname);
  await writeParseErrorLog(result);
  return result;
}

async function main() {
  const result = await parseFinkelSourceFromFile();
  const { stats, errors } = result;
  console.log(`Parsed ${stats.blockCount} blocks from ${stats.lineCount} lines.`);
  console.log(`
    Entries: ${stats.entryLineCount},
    Subentries: ${stats.subentryLineCount},
    Comments: ${stats.commentLineCount},
    Empty: ${stats.emptyLineCount}`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} parse error(s) found. See parse-errors.log for details.`);
    process.exit(1);
  } else {
    console.log("No parse errors found.");
  }
}

if (import.meta.main) {
  await main();
}
