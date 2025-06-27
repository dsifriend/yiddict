/**
 * Batch processor for OntoLex-Lemon lexicons
 * @fileoverview Provides functionality for processing multiple lexical data files and converting them to OntoLex format
 */

import { promises as fs } from "fs";
import { join, extname, basename } from "path";
import { LexicalEntryBuilder } from "../builders/entry";
import { LexiconBuilder } from "../builders/lexicon";
import {
  PartOfSpeech,
  Gender,
  Number,
  Case,
  Tense,
  Voice,
  Mood,
  Person,
} from "../enums/linguistic";
import { LexicalEntry, Lexicon } from "../interfaces/ontolex";
import { MorphologicalFeatures } from "../interfaces/linguistic";
import { LanguageTag } from "../types/core";

/**
 * Input format for lexical data from JSON files
 * This interface represents the expected structure of input data
 *
 * Only meant as a convenience for common use cases.
 * Lexicon designers may choose to define their own to better suit their data.
 */
export interface LexicalDataInput {
  /** The word or term */
  word: string;
  /** Language code */
  language: string;
  /** Part of speech (string that will be mapped to enum) */
  partOfSpeech?: string;
  /** Pronunciation information */
  pronunciation?: {
    ipa?: string;
    audio?: string;
    hint?: string;
  };
  /** Etymology information */
  etymology?: string;
  /** Array of senses/meanings */
  senses?: Array<{
    definition: string;
    examples?: string[];
    translations?: Array<{
      text: string;
      language: string;
      confidence?: number;
    }>;
    synonyms?: string[];
    antonyms?: string[];
  }>;
  /** Inflected forms */
  forms?: Array<{
    writtenRep: string;
    features?: {
      gender?: string[];
      number?: string[];
      case?: string[];
      tense?: string[];
      voice?: string[];
      mood?: string[];
      person?: string[];
    };
  }>;
  /** Usage information */
  usage?: {
    register?: string[];
    domain?: string[];
    frequency?: number;
  };
  /** Labels like "informal", "archaic" */
  labels?: string[];
  /** Source identifier */
  source?: string;
}

/**
 * Options for the lexicon processor
 */
export interface ProcessorOptions {
  /** Whether to validate entries before adding them */
  validateEntries?: boolean;
  /** Whether to skip duplicate entries */
  skipDuplicates?: boolean;
  /** Whether to merge entries with the same canonical form */
  mergeEntries?: boolean;
  /** Default source identifier if not provided in data */
  defaultSource?: string;
  /** Whether to log processing progress */
  verbose?: boolean;
}

/**
 * Batch processor for converting lexical data to OntoLex-Lemon format
 * Handles file processing, data conversion, and lexicon building
 */
export class LexiconProcessor {
  private lexiconBuilder: LexiconBuilder;
  private processedEntries: Map<string, LexicalEntry>;
  private options: ProcessorOptions;
  private errorLog: Array<{ file?: string; entry?: string; error: string }>;

  /**
   * Creates a new LexiconProcessor
   * @param language - Primary language of the lexicon
   * @param title - Title for the lexicon
   * @param options - Processing options
   *
   * @example
   * ```typescript
   * const processor = new LexiconProcessor('en', 'English Dictionary', {
   *   validateEntries: true,
   *   skipDuplicates: true,
   *   verbose: true
   * });
   * ```
   */
  constructor(
    language: LanguageTag,
    title: string,
    options: ProcessorOptions = {}
  ) {
    this.lexiconBuilder = new LexiconBuilder(language, title);
    this.processedEntries = new Map();
    this.options = {
      validateEntries: true,
      skipDuplicates: true,
      mergeEntries: false,
      verbose: false,
      ...options,
    };
    this.errorLog = [];
  }

  /**
   * Processes all JSON files in a directory
   * @param dirPath - Path to the directory containing JSON files
   * @returns Promise that resolves when processing is complete
   *
   * @example
   * ```typescript
   * await processor.processDirectory('./lexicon-data');
   * ```
   */
  async processDirectory(dirPath: string): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      const jsonFiles = files.filter(
        (file) => extname(file).toLowerCase() === ".json"
      );

      if (jsonFiles.length === 0) {
        throw new Error(`No JSON files found in directory: ${dirPath}`);
      }

      if (this.options.verbose) {
        console.log(`Found ${jsonFiles.length} JSON files to process`);
      }

      for (const file of jsonFiles) {
        const filePath = join(dirPath, file);
        await this.processFile(filePath);
      }

      if (this.options.verbose) {
        console.log(`Completed processing ${jsonFiles.length} files`);
        console.log(`Total entries: ${this.processedEntries.size}`);
        if (this.errorLog.length > 0) {
          console.log(`Errors encountered: ${this.errorLog.length}`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.errorLog.push({
        error: `Directory processing failed: ${errorMessage}`,
      });
      throw error;
    }
  }

  /**
   * Processes a single JSON file
   * @param filePath - Path to the JSON file
   * @returns Promise that resolves when file is processed
   *
   * @example
   * ```typescript
   * await processor.processFile('./data/entries-a.json');
   * ```
   */
  async processFile(filePath: string): Promise<void> {
    try {
      if (this.options.verbose) {
        console.log(`Processing file: ${filePath}`);
      }

      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      // Handle both single entry and array of entries
      const entries = Array.isArray(data) ? data : data.entries || [data];
      const source = this.options.defaultSource || basename(filePath, ".json");

      let processedCount = 0;
      for (const entryData of entries) {
        try {
          await this.processEntryData(entryData, source);
          processedCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.errorLog.push({
            file: filePath,
            entry: entryData.word || "unknown",
            error: errorMessage,
          });
        }
      }

      if (this.options.verbose) {
        console.log(`Processed ${processedCount} entries from ${filePath}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.errorLog.push({
        file: filePath,
        error: `File processing failed: ${errorMessage}`,
      });
      throw error;
    }
  }

  /**
   * Processes a single entry data object
   * @param entryData - The entry data to process
   * @param source - Source identifier for the entry
   * @returns Promise that resolves when entry is processed
   */
  async processEntryData(
    entryData: LexicalDataInput,
    source: string
  ): Promise<void> {
    if (!entryData.word || !entryData.language) {
      throw new Error("Entry must have 'word' and 'language' fields");
    }

    // Create unique key for duplicate checking
    const entryKey = `${
      entryData.language
    }-${entryData.word.toLowerCase()}-${source}`;

    // Check for duplicates if configured
    if (this.options.skipDuplicates && this.processedEntries.has(entryKey)) {
      if (this.options.verbose) {
        console.log(`Skipping duplicate entry: ${entryData.word}`);
      }
      return;
    }

    // Convert to LexicalEntry
    const entry = this.convertToLexicalEntry(entryData, source);

    // Validate if configured
    if (this.options.validateEntries) {
      this.validateEntry(entry);
    }

    // Add to processed entries
    this.processedEntries.set(entryKey, entry);
    this.lexiconBuilder.addEntry(entry);
  }

  /**
   * Converts input data to a LexicalEntry
   * @param data - Input data
   * @param source - Source identifier
   * @returns Converted LexicalEntry
   * @private
   */
  private convertToLexicalEntry(
    data: LexicalDataInput,
    source: string
  ): LexicalEntry {
    // Map part of speech string to enum
    const partOfSpeech = data.partOfSpeech
      ? this.mapPartOfSpeech(data.partOfSpeech)
      : undefined;

    // Create entry builder
    const builder = new LexicalEntryBuilder(
      data.word,
      data.language,
      partOfSpeech
    );

    // Add pronunciation
    if (data.pronunciation) {
      builder.addPronunciation(
        data.pronunciation.ipa,
        data.pronunciation.audio as any
      );
    }

    // Add etymology
    if (data.etymology) {
      builder.addEtymology(data.etymology, data.language);
    }

    // Add senses
    if (data.senses && data.senses.length > 0) {
      data.senses.forEach((senseData, index) => {
        const senseBuilder = builder.addSense(
          senseData.definition,
          data.language
        );

        // Add sense number
        senseBuilder.setSenseNumber((index + 1).toString());

        // Add examples
        if (senseData.examples) {
          senseData.examples.forEach((example) => {
            senseBuilder.addExample(example, data.language);
          });
        }

        // Add translations
        if (senseData.translations) {
          senseData.translations.forEach((trans) => {
            senseBuilder.addTranslation(
              trans.text,
              trans.language,
              trans.confidence
            );
          });
        }

        // Note: synonyms and antonyms would need URIs in the real implementation
        // For now, we'll skip them or add a comment about them
      });
    }

    // Add forms
    if (data.forms) {
      data.forms.forEach((formData) => {
        const features = this.convertMorphologicalFeatures(formData.features);
        builder.addForm(formData.writtenRep, features);
      });
    }

    // Add labels
    if (data.labels) {
      data.labels.forEach((label) => {
        builder.addLabel(label, data.language);
      });
    }

    // Set source
    builder.setSource(data.source || source);

    return builder.build();
  }

  /**
   * Maps part of speech string to enum value
   * @param pos - Part of speech string
   * @returns PartOfSpeech enum value or undefined
   * @private
   */
  private mapPartOfSpeech(pos: string): PartOfSpeech | undefined {
    const mapping: Record<string, PartOfSpeech> = {
      "noun": PartOfSpeech.NOUN,
      "verb": PartOfSpeech.VERB,
      "adjective": PartOfSpeech.ADJECTIVE,
      "adverb": PartOfSpeech.ADVERB,
      "preposition": PartOfSpeech.PREPOSITION,
      "conjunction": PartOfSpeech.CONJUNCTION,
      "determiner": PartOfSpeech.DETERMINER,
      "pronoun": PartOfSpeech.PRONOUN,
      "interjection": PartOfSpeech.INTERJECTION,
      "particle": PartOfSpeech.PARTICLE,
      "numeral": PartOfSpeech.NUMERAL,
      "proper noun": PartOfSpeech.PROPER_NOUN,
      "proper-noun": PartOfSpeech.PROPER_NOUN,
      "propernoun": PartOfSpeech.PROPER_NOUN,
    };

    return mapping[pos.toLowerCase()];
  }

  /**
   * Converts morphological feature strings to enum values
   * @param features - Feature strings
   * @returns MorphologicalFeatures object
   * @private
   */
  private convertMorphologicalFeatures(
    features?: any
  ): MorphologicalFeatures | undefined {
    if (!features) return undefined;

    const result: MorphologicalFeatures = {};

    // Convert gender
    if (features.gender) {
      result.gender = features.gender
        .map((g: string) => this.mapGender(g))
        .filter(Boolean);
    }

    // Convert number
    if (features.number) {
      result.number = features.number
        .map((n: string) => this.mapNumber(n))
        .filter(Boolean);
    }

    // Convert case
    if (features.case) {
      result.case = features.case
        .map((c: string) => this.mapCase(c))
        .filter(Boolean);
    }

    // Convert tense
    if (features.tense) {
      result.tense = features.tense
        .map((t: string) => this.mapTense(t))
        .filter(Boolean);
    }

    // Convert voice
    if (features.voice) {
      result.voice = features.voice
        .map((v: string) => this.mapVoice(v))
        .filter(Boolean);
    }

    // Convert mood
    if (features.mood) {
      result.mood = features.mood
        .map((m: string) => this.mapMood(m))
        .filter(Boolean);
    }

    // Convert person
    if (features.person) {
      result.person = features.person
        .map((p: string) => this.mapPerson(p))
        .filter(Boolean);
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  // Mapping helper methods
  private mapGender(gender: string): Gender | undefined {
    const mapping: Record<string, Gender> = {
      masculine: Gender.MASCULINE,
      feminine: Gender.FEMININE,
      neuter: Gender.NEUTER,
      common: Gender.COMMON,
    };
    return mapping[gender.toLowerCase()];
  }

  private mapNumber(num: string): Number | undefined {
    const mapping: Record<string, Number> = {
      singular: Number.SINGULAR,
      plural: Number.PLURAL,
      dual: Number.DUAL,
    };
    return mapping[num.toLowerCase()];
  }

  private mapCase(c: string): Case | undefined {
    const mapping: Record<string, Case> = {
      nominative: Case.NOMINATIVE,
      accusative: Case.ACCUSATIVE,
      genitive: Case.GENITIVE,
      dative: Case.DATIVE,
      ablative: Case.ABLATIVE,
      instrumental: Case.INSTRUMENTAL,
      locative: Case.LOCATIVE,
      vocative: Case.VOCATIVE,
    };
    return mapping[c.toLowerCase()];
  }

  private mapTense(tense: string): Tense | undefined {
    const mapping: Record<string, Tense> = {
      present: Tense.PRESENT,
      past: Tense.PAST,
      future: Tense.FUTURE,
      imperfect: Tense.IMPERFECT,
      perfect: Tense.PERFECT,
      pluperfect: Tense.PLUPERFECT,
    };
    return mapping[tense.toLowerCase()];
  }

  private mapVoice(voice: string): Voice | undefined {
    const mapping: Record<string, Voice> = {
      active: Voice.ACTIVE,
      passive: Voice.PASSIVE,
      middle: Voice.MIDDLE,
    };
    return mapping[voice.toLowerCase()];
  }

  private mapMood(mood: string): Mood | undefined {
    const mapping: Record<string, Mood> = {
      indicative: Mood.INDICATIVE,
      subjunctive: Mood.SUBJUNCTIVE,
      imperative: Mood.IMPERATIVE,
      conditional: Mood.CONDITIONAL,
      optative: Mood.OPTATIVE,
    };
    return mapping[mood.toLowerCase()];
  }

  private mapPerson(person: string): Person | undefined {
    const mapping: Record<string, Person> = {
      "first": Person.FIRST,
      "1st": Person.FIRST,
      "1": Person.FIRST,
      "second": Person.SECOND,
      "2nd": Person.SECOND,
      "2": Person.SECOND,
      "third": Person.THIRD,
      "3rd": Person.THIRD,
      "3": Person.THIRD,
    };
    return mapping[person.toLowerCase()];
  }

  /**
   * Validates a lexical entry
   * @param entry - Entry to validate
   * @throws {Error} If validation fails
   * @private
   */
  private validateEntry(entry: LexicalEntry): void {
    if (!entry.id || !entry.type || !entry.canonicalForm || !entry.language) {
      throw new Error("Entry missing required fields");
    }

    if (
      !entry.canonicalForm.writtenRep ||
      entry.canonicalForm.writtenRep.length === 0
    ) {
      throw new Error(
        "Canonical form must have at least one written representation"
      );
    }
  }

  /**
   * Processes a batch of entries
   * @param entries - Array of entry data to process
   * @param source - Source identifier for the batch
   * @returns Promise that resolves when batch is processed
   */
  async processBatch(
    entries: LexicalDataInput[],
    source?: string
  ): Promise<void> {
    const batchSource = source || this.options.defaultSource || "batch";

    for (const entry of entries) {
      try {
        await this.processEntryData(entry, batchSource);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.errorLog.push({
          entry: entry.word || "unknown",
          error: errorMessage,
        });
      }
    }
  }

  /**
   * Gets the built lexicon
   * @returns The completed Lexicon
   *
   * @example
   * ```typescript
   * const lexicon = processor.getLexicon();
   * ```
   */
  getLexicon(): Lexicon {
    return this.lexiconBuilder.build();
  }

  /**
   * Gets the number of processed entries
   * @returns Number of entries processed
   */
  getEntryCount(): number {
    return this.processedEntries.size;
  }

  /**
   * Gets all errors encountered during processing
   * @returns Array of error records
   */
  getErrors(): Array<{ file?: string; entry?: string; error: string }> {
    return [...this.errorLog];
  }

  /**
   * Clears all processed entries and errors
   */
  clear(): void {
    this.processedEntries.clear();
    this.errorLog = [];
    this.lexiconBuilder.clearEntries();
  }

  /**
   * Sets the lexicon version
   * @param version - Version string
   */
  setVersion(version: string): void {
    this.lexiconBuilder.setVersion(version);
  }

  /**
   * Sets the lexicon creator
   * @param creator - Creator name or identifier
   */
  setCreator(creator: string): void {
    this.lexiconBuilder.setCreator(creator);
  }

  /**
   * Adds a language to the lexicon
   * @param language - Language code to add
   */
  addLanguage(language: LanguageTag): void {
    this.lexiconBuilder.addLanguage(language);
  }
}
