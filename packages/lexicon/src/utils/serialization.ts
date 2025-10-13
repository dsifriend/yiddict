/**
 * Serialization and utility functions for OntoLex-Lemon lexicons
 * @fileoverview Provides functions for JSON serialization, merging, and database preparation
 */

import { v5 as uuidv5 } from "uuid";
import { FormType } from "../enums/linguistic";
import { Lexicon, LexicalEntry } from "../interfaces/ontolex";

/**
 * Database record types for PostgreSQL insertion
 */
export interface DatabaseRecords {
  /** Main lexicon record */
  lexicon_record: any;
  /** Array of lexical entry records */
  entry_records: any[];
  /** Array of lexical sense records */
  sense_records: any[];
  /** Array of form records */
  form_records: any[];
}

/**
 * Utility class for lexicon operations
 * Provides static methods for common lexicon manipulations
 */
export class LexiconUtils {
  /**
   * Converts a lexicon to JSON string with pretty formatting
   * @param lexicon - The lexicon to serialize
   * @param space - Number of spaces for indentation (default: 2)
   * @returns JSON string representation
   *
   * @example
   * ```typescript
   * const json = LexiconUtils.toJSON(lexicon);
   * await fs.writeFile('lexicon.json', json);
   * ```
   */
  static toJSON(lexicon: Lexicon, space: number = 2): string {
    return JSON.stringify(lexicon, null, space);
  }

  /**
   * Creates a lexicon from JSON string
   * @param json - JSON string to parse
   * @returns Parsed lexicon object
   * @throws {Error} If JSON is invalid or doesn't represent a valid lexicon
   *
   * @example
   * ```typescript
   * const json = await fs.readFile('lexicon.json', 'utf-8');
   * const lexicon = LexiconUtils.fromJSON(json);
   * ```
   */
  static fromJSON(json: string): Lexicon {
    try {
      const parsed = JSON.parse(json);

      // Basic validation
      if (!parsed.id || !parsed.type || parsed.type !== "lime:Lexicon") {
        throw new Error("Invalid lexicon format: missing required fields");
      }

      if (!parsed.language || !Array.isArray(parsed.language)) {
        throw new Error("Invalid lexicon format: language must be an array");
      }

      if (!parsed.entries || !Array.isArray(parsed.entries)) {
        throw new Error("Invalid lexicon format: entries must be an array");
      }

      return parsed as Lexicon;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Merges multiple lexicons into a single (base) lexicon.
   * Removes duplicate entries based on canonical form and language.
   *
   * If no title is provided, the merged lexicon will use the ID
   * of the first lexicon to facilitate merging/updating in place.
   * @param lexicons - Array of lexicons to merge
   * @param title - Optional title for the merged lexicon
   * @returns A new merged lexicon
   * @throws {Error} If no lexicons provided
   *
   * @example
   * ```typescript
   * const merged = LexiconUtils.mergeLexicons([
   *   englishLexicon,
   *   frenchLexicon,
   *   germanLexicon
   * ], 'Multilingual Dictionary');
   * ```
   */
  static mergeLexicons(lexicons: Lexicon[], title?: string): Lexicon {
    if (lexicons.length === 0) {
      throw new Error("Cannot merge empty array of lexicons");
    }

    const base = lexicons[0];
    const merged: Lexicon = {
      ...base,
      id: title ? `urn:uuid:${uuidv5(title, base.id)}` : base.id,
      entries: [],
      created: new Date(),
      version: "merged",
      title: title ? [{ value: title, lang: base.language[0] }] : base.title,
    };

    // Collect all languages
    const allLanguages = new Set<string>();
    lexicons.forEach((lex) =>
      lex.language.forEach((lang) => allLanguages.add(lang))
    );
    merged.language = Array.from(allLanguages);

    // Merge entries, avoiding duplicates
    const seenEntries = new Set<string>();

    for (const lexicon of lexicons) {
      for (const entry of lexicon.entries) {
        // Distinguishh entries by lanugage, canonical form, and source if present.
        // This ensures contributors can update their own entries w/o conflict.
        const key = `${entry.language}${
          entry.source ? `-${entry.source}-` : "-"
        }${entry.canonicalForm.writtenRep[0].value}`;
        if (!seenEntries.has(key)) {
          seenEntries.add(key);
          merged.entries.push(entry);
        }
      }
    }

    // Merge creators
    const allCreators = new Set<string>();
    lexicons.forEach((lex) => {
      if (lex.creator) {
        lex.creator.forEach((creator) => allCreators.add(creator));
      }
    });
    if (allCreators.size > 0) {
      merged.creator = Array.from(allCreators);
    }

    return merged;
  }

  /**
   * Prepares lexicon data for PostgreSQL database insertion
   * Flattens the hierarchical structure into relational records
   * @param lexicon - The lexicon to prepare
   * @returns Object containing prepared database records
   *
   * @example
   * ```typescript
   * const prepared = LexiconUtils.prepareForDatabase(lexicon);
   * // Use prepared.lexicon_record, prepared.entry_records, etc.
   * ```
   */
  static prepareForDatabase(lexicon: Lexicon): DatabaseRecords {
    const lexicon_record = {
      id: lexicon.id,
      language: lexicon.language,
      title: lexicon.title?.[0]?.value,
      description: lexicon.description?.[0]?.value,
      version: lexicon.version,
      creator: lexicon.creator,
      license: lexicon.license,
      created: lexicon.created,
      modified: lexicon.modified,
      data: lexicon, // Store full JSON for complex queries
    };

    const entry_records = lexicon.entries.map((entry) => ({
      id: entry.id,
      lexicon_id: lexicon.id,
      canonical_form: entry.canonicalForm.writtenRep[0].value,
      language: entry.language,
      part_of_speech: entry.partOfSpeech,
      pronunciation_ipa: entry.pronunciation?.ipa,
      etymology: entry.etymology?.description?.[0]?.value,
      source: entry.source,
      created_date: entry.createdDate,
      modified_date: entry.modifiedDate,
      data: entry, // Store full JSON
    }));

    const sense_records: any[] = [];
    const form_records: any[] = [];

    lexicon.entries.forEach((entry) => {
      // Add canonical form
      form_records.push({
        id: entry.canonicalForm.id,
        entry_id: entry.id,
        form_type: entry.canonicalForm.formType || FormType.CANONICAL,
        written_rep: entry.canonicalForm.writtenRep[0].value,
        language: entry.language,
        phonetic_rep: entry.canonicalForm.phoneticRep?.[0],
        morphological_features: entry.canonicalForm.morphologicalFeatures,
        form_label: entry.canonicalForm.formLabel?.[0]?.value,
        data: entry.canonicalForm,
      });

      // Add other forms
      entry.otherForms?.forEach((form) => {
        form_records.push({
          id: form.id,
          entry_id: entry.id,
          form_type: form.formType || FormType.INFLECTED,
          written_rep: form.writtenRep[0].value,
          language: entry.language,
          phonetic_rep: form.phoneticRep?.[0],
          morphological_features: form.morphologicalFeatures,
          form_label: form.formLabel?.[0]?.value,
          data: form,
        });
      });

      // Add senses
      entry.lexicalSenses?.forEach((sense, index) => {
        sense_records.push({
          id: sense.id,
          entry_id: entry.id,
          sense_number: sense.senseNumber || (index + 1).toString(),
          definition: sense.definition?.[0]?.value,
          examples: sense.examples?.map((ex) => ex.value),
          translations: sense.translations,
          usage_info: sense.usage,
          data: sense,
        });
      });
    });

    return {
      lexicon_record,
      entry_records,
      sense_records,
      form_records,
    };
  }

  /**
   * Validates a lexicon object structure
   * @param lexicon - The lexicon to validate
   * @returns Array of validation error messages (empty if valid)
   *
   * @example
   * ```typescript
   * const errors = LexiconUtils.validateLexicon(lexicon);
   * if (errors.length > 0) {
   *   console.error('Validation errors:', errors);
   * }
   * ```
   */
  static validateLexicon(lexicon: any): string[] {
    const errors: string[] = [];

    // Check required top-level fields
    if (!lexicon.id) errors.push("Lexicon missing required field: id");
    if (!lexicon.type || lexicon.type !== "lime:Lexicon") {
      errors.push("Lexicon missing or invalid type field");
    }
    if (
      !lexicon.language ||
      !Array.isArray(lexicon.language) ||
      lexicon.language.length === 0
    ) {
      errors.push("Lexicon must have at least one language");
    }
    if (!lexicon.entries || !Array.isArray(lexicon.entries)) {
      errors.push("Lexicon must have entries array");
    }

    // Validate entries
    if (lexicon.entries) {
      lexicon.entries.forEach((entry: any, index: number) => {
        const entryErrors = this.validateLexicalEntry(entry);
        entryErrors.forEach((error) => {
          errors.push(`Entry ${index}: ${error}`);
        });
      });
    }

    return errors;
  }

  /**
   * Validates a lexical entry structure
   * @param entry - The entry to validate
   * @returns Array of validation error messages
   * @private
   */
  private static validateLexicalEntry(entry: any): string[] {
    const errors: string[] = [];

    if (!entry.id) errors.push("missing required field: id");
    if (!entry.type || entry.type !== "ontolex:LexicalEntry") {
      errors.push("missing or invalid type field");
    }
    if (!entry.language) errors.push("missing required field: language");
    if (!entry.canonicalForm) {
      errors.push("missing required field: canonicalForm");
    } else {
      const formErrors = this.validateForm(entry.canonicalForm);
      formErrors.forEach((error) => errors.push(`canonicalForm: ${error}`));
    }

    // Validate other forms if present
    if (entry.otherForms) {
      if (!Array.isArray(entry.otherForms)) {
        errors.push("otherForms must be an array");
      } else {
        entry.otherForms.forEach((form: any, index: number) => {
          const formErrors = this.validateForm(form);
          formErrors.forEach((error) =>
            errors.push(`otherForms[${index}]: ${error}`)
          );
        });
      }
    }

    // Validate senses if present
    if (entry.lexicalSenses) {
      if (!Array.isArray(entry.lexicalSenses)) {
        errors.push("lexicalSenses must be an array");
      } else {
        entry.lexicalSenses.forEach((sense: any, index: number) => {
          const senseErrors = this.validateLexicalSense(sense);
          senseErrors.forEach((error) =>
            errors.push(`lexicalSenses[${index}]: ${error}`)
          );
        });
      }
    }

    return errors;
  }

  /**
   * Validates a form structure
   * @param form - The form to validate
   * @returns Array of validation error messages
   * @private
   */
  private static validateForm(form: any): string[] {
    const errors: string[] = [];

    if (!form.id) errors.push("missing required field: id");
    if (!form.type || form.type !== "ontolex:Form") {
      errors.push("missing or invalid type field");
    }
    if (
      !form.writtenRep ||
      !Array.isArray(form.writtenRep) ||
      form.writtenRep.length === 0
    ) {
      errors.push("must have at least one writtenRep");
    }

    return errors;
  }

  /**
   * Validates a lexical sense structure
   * @param sense - The sense to validate
   * @returns Array of validation error messages
   * @private
   */
  private static validateLexicalSense(sense: any): string[] {
    const errors: string[] = [];

    if (!sense.id) errors.push("missing required field: id");
    if (!sense.type || sense.type !== "ontolex:LexicalSense") {
      errors.push("missing or invalid type field");
    }

    return errors;
  }

  /**
   * Filters lexicon entries by language
   * @param lexicon - The source lexicon
   * @param language - Language code to filter by
   * @returns New lexicon containing only entries in the specified language
   *
   * @example
   * ```typescript
   * const englishOnly = LexiconUtils.filterByLanguage(multilingualLexicon, 'en');
   * ```
   */
  static filterByLanguage(lexicon: Lexicon, language: string): Lexicon {
    const filtered = {
      ...lexicon,
      id: `urn:uuid:${uuidv5(language, lexicon.id)}`, // Generate new ID for filtered lexicon
      language: [language],
      entries: lexicon.entries.filter((entry) => entry.language === language),
      created: new Date(),
      version: `${lexicon.version || "filtered"}-${language}`,
    };

    return filtered;
  }

  /**
   * Groups lexicon entries by part of speech
   * @param lexicon - The source lexicon
   * @returns Map of part of speech to entries
   *
   * @example
   * ```typescript
   * const byPos = LexiconUtils.groupByPartOfSpeech(lexicon);
   * const verbs = byPos.get('lexinfo:verb') || [];
   * ```
   */
  static groupByPartOfSpeech(lexicon: Lexicon): Map<string, LexicalEntry[]> {
    const groups = new Map<string, LexicalEntry[]>();

    lexicon.entries.forEach((entry) => {
      if (entry.partOfSpeech) {
        entry.partOfSpeech.forEach((pos) => {
          if (!groups.has(pos)) {
            groups.set(pos, []);
          }
          groups.get(pos)!.push(entry);
        });
      } else {
        // Entries without part of speech
        if (!groups.has("unknown")) {
          groups.set("unknown", []);
        }
        groups.get("unknown")!.push(entry);
      }
    });

    return groups;
  }

  /**
   * Generates lexicon statistics
   * @param lexicon - The lexicon to analyze
   * @returns Object containing various statistics
   *
   * @example
   * ```typescript
   * const stats = LexiconUtils.generateStatistics(lexicon);
   * console.log(`Total entries: ${stats.totalEntries}`);
   * console.log(`Languages: ${stats.languages.join(', ')}`);
   * ```
   */
  static generateStatistics(lexicon: Lexicon) {
    const stats = {
      totalEntries: lexicon.entries.length,
      languages: lexicon.language,
      entriesByLanguage: new Map<string, number>(),
      entriesByPartOfSpeech: new Map<string, number>(),
      totalSenses: 0,
      totalForms: 0,
      averageSensesPerEntry: 0,
      averageFormsPerEntry: 0,
      entriesWithPronunciation: 0,
      entriesWithEtymology: 0,
      entriesWithMultipleSenses: 0,
    };

    // Count entries by language
    lexicon.entries.forEach((entry) => {
      const lang = entry.language;
      stats.entriesByLanguage.set(
        lang,
        (stats.entriesByLanguage.get(lang) || 0) + 1
      );
    });

    // Count entries by part of speech
    lexicon.entries.forEach((entry) => {
      if (entry.partOfSpeech) {
        entry.partOfSpeech.forEach((pos) => {
          stats.entriesByPartOfSpeech.set(
            pos,
            (stats.entriesByPartOfSpeech.get(pos) || 0) + 1
          );
        });
      }
    });

    // Calculate detailed statistics
    lexicon.entries.forEach((entry) => {
      // Count senses
      const senseCount = entry.lexicalSenses?.length || 0;
      stats.totalSenses += senseCount;
      if (senseCount > 1) {
        stats.entriesWithMultipleSenses++;
      }

      // Count forms (canonical + other forms)
      const formCount = 1 + (entry.otherForms?.length || 0);
      stats.totalForms += formCount;

      // Check for pronunciation
      if (entry.pronunciation?.ipa) {
        stats.entriesWithPronunciation++;
      }

      // Check for etymology
      if (entry.etymology?.description?.length) {
        stats.entriesWithEtymology++;
      }
    });

    // Calculate averages
    if (stats.totalEntries > 0) {
      stats.averageSensesPerEntry = stats.totalSenses / stats.totalEntries;
      stats.averageFormsPerEntry = stats.totalForms / stats.totalEntries;
    }

    return stats;
  }

  /**
   * Finds potential duplicate entries in a lexicon
   * @param lexicon - The lexicon to check
   * @returns Array of arrays, each containing potential duplicates
   *
   * @example
   * ```typescript
   * const duplicates = LexiconUtils.findDuplicates(lexicon);
   * duplicates.forEach(group => {
   *   console.log('Potential duplicates:', group.map(e => e.canonicalForm.writtenRep[0].value));
   * });
   * ```
   */
  static findDuplicates(lexicon: Lexicon): LexicalEntry[][] {
    const groups = new Map<string, LexicalEntry[]>();

    // Group by canonical form and language
    lexicon.entries.forEach((entry) => {
      const key = `${entry.canonicalForm.writtenRep[0].value.toLowerCase()}-${
        entry.language
      }`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });

    // Return only groups with more than one entry
    return Array.from(groups.values()).filter((group) => group.length > 1);
  }

  /**
   * Converts a lexicon to a simplified format for export
   * @param lexicon - The lexicon to simplify
   * @returns Simplified object suitable for CSV or basic JSON export
   *
   * @example
   * ```typescript
   * const simplified = LexiconUtils.toSimplifiedFormat(lexicon);
   * // Can be easily converted to CSV or used in spreadsheets
   * ```
   */
  static toSimplifiedFormat(lexicon: Lexicon) {
    return lexicon.entries.map((entry) => ({
      word: entry.canonicalForm.writtenRep[0].value,
      language: entry.language,
      partOfSpeech: entry.partOfSpeech?.join(", "),
      pronunciation: entry.pronunciation?.ipa,
      definition: entry.lexicalSenses?.[0]?.definition?.[0]?.value,
      etymology: entry.etymology?.description?.[0]?.value,
      examples: entry.lexicalSenses?.[0]?.examples
        ?.map((ex) => ex.value)
        .join(" | "),
      source: entry.source,
    }));
  }
}
