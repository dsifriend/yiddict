/**
 * OntoLex-Lemon TypeScript Library
 * @fileoverview Main export file providing access to all public APIs
 */

// Core types and constants
export {
  URI,
  LanguageTag,
  LiteralValue,
  LangString,
  Literal,
  NamespaceMap,
  DEFAULT_NAMESPACES,
} from "./types/core";

// Linguistic enumerations
export {
  PartOfSpeech,
  MorphologicalPattern,
  Gender,
  Number,
  Case,
  Tense,
  Voice,
  Mood,
  Person,
} from "./enums/linguistic";

// Linguistic interfaces
export {
  MorphoSyntacticProperty,
  MorphologicalFeatures,
  Pronunciation,
  Etymology,
  Usage,
} from "./interfaces/linguistic";

// OntoLex-Lemon interfaces
export {
  Translation,
  Form,
  LexicalSense,
  Component,
  LexicalEntry,
  LexicalConcept,
  ConceptualRelation,
  Lexicon,
} from "./interfaces/ontolex";

// Builder classes
export { LexicalEntryBuilder, LexicalSenseBuilder } from "./builders/entry";
export { LexiconBuilder } from "./builders/lexicon";

// Processing
export {
  LexiconProcessor,
  LexicalDataInput,
  ProcessorOptions,
} from "./processing/processor";

// Utilities
export { LexiconUtils, DatabaseRecords } from "./utils/serialization";

// Database management
export {
  SupabaseLexiconManager,
  SearchResult,
  LexiconStats,
  SourceStats,
} from "./database/manager";

// Version information
export const VERSION = "0.1.0";

/**
 * Quick start example:
 *
 * ```typescript
 * import {
 *   LexicalEntryBuilder,
 *   LexiconBuilder,
 *   PartOfSpeech
 * } from '@yiddict/lexicon';
 *
 * // Create an entry
 * const entry = new LexicalEntryBuilder('hello', 'en', PartOfSpeech.INTERJECTION)
 *   .addSense('A greeting')
 *   .addExample('Hello, world!')
 *   .build();
 *
 * // Create a lexicon
 * const lexicon = new LexiconBuilder('en', 'My Lexicon')
 *   .addEntry(entry)
 *   .build();
 * ```
 */
