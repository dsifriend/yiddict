/**
 * Builder class for constructing OntoLex-Lemon lexicons
 * @fileoverview Provides fluent API for building lexicon containers with metadata
 */

import { v5 as uuidv5 } from "uuid";
import { URI, LanguageTag, NamespaceMap } from "../types/core";
import { DEFAULT_NAMESPACES } from "../types/core";
import {
  Lexicon,
  LexicalEntry,
  LexicalConcept,
  ConceptualRelation,
} from "../interfaces/ontolex";

/**
 * Builder for constructing Lexicon objects
 * Provides a fluent API for building lexicon containers with metadata and entries
 */
export class LexiconBuilder {
  private lexicon: Partial<Lexicon>;

  /**
   * Creates a new LexiconBuilder
   * @param language - Primary language of the lexicon
   * @param title - Optional title for the lexicon
   *
   * @example
   * ```typescript
   * const builder = new LexiconBuilder('en', 'English Medical Terminology');
   * ```
   */
  constructor(language: LanguageTag, title?: string) {
    this.lexicon = {
      id: `urn:uuid:${uuidv5(title || language, language)}`,
      type: "lime:Lexicon",
      language: [language],
      entries: [],
      namespaces: { ...DEFAULT_NAMESPACES },
      created: new Date(),
    };

    if (title) {
      this.lexicon.title = [{ value: title, lang: language }];
    }
  }

  /**
   * Adds a single lexical entry to the lexicon
   * @param entry - The lexical entry to add
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addEntry(runEntry)
   *        .addEntry(walkEntry);
   * ```
   */
  addEntry(entry: LexicalEntry): this {
    if (!this.lexicon.entries) this.lexicon.entries = [];
    this.lexicon.entries.push(entry);
    return this;
  }

  /**
   * Adds multiple lexical entries to the lexicon
   * @param entries - Array of lexical entries to add
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addEntries([entry1, entry2, entry3]);
   * ```
   */
  addEntries(entries: LexicalEntry[]): this {
    if (!this.lexicon.entries) this.lexicon.entries = [];
    this.lexicon.entries.push(...entries);
    return this;
  }

  /**
   * Adds an additional language to the lexicon
   * @param language - Language code to add
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addLanguage('fr')
   *        .addLanguage('de');
   * ```
   */
  addLanguage(language: LanguageTag): this {
    if (!this.lexicon.language!.includes(language)) {
      this.lexicon.language!.push(language);
    }
    return this;
  }

  /**
   * Sets the version identifier for the lexicon
   * @param version - Version string (e.g., '1.0.0', '2024.06')
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.setVersion('2024.06.15');
   * ```
   */
  setVersion(version: string): this {
    this.lexicon.version = version;
    return this;
  }

  /**
   * Adds a creator to the lexicon
   * @param creator - Name or identifier of the creator
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.setCreator('John Doe')
   *        .setCreator('Jane Smith');
   * ```
   */
  setCreator(creator: string): this {
    if (!this.lexicon.creator) this.lexicon.creator = [];
    this.lexicon.creator.push(creator);
    return this;
  }

  /**
   * Sets the license under which the lexicon is published
   * @param license - License URI or identifier
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.setLicense('https://creativecommons.org/licenses/by/4.0/');
   * ```
   */
  setLicense(license: URI): this {
    this.lexicon.license = license;
    return this;
  }

  /**
   * Adds a description to the lexicon
   * @param description - Description text
   * @param language - Language of the description (defaults to first lexicon language)
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addDescription('A comprehensive English medical lexicon', 'en')
   *        .addDescription('Un lexique médical anglais complet', 'fr');
   * ```
   */
  addDescription(description: string, language?: LanguageTag): this {
    if (!this.lexicon.description) this.lexicon.description = [];
    this.lexicon.description.push({
      value: description,
      lang: language || this.lexicon.language![0],
    });
    return this;
  }

  /**
   * Adds a title in an additional language
   * @param title - Title text
   * @param language - Language of the title
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addTitle('Medical Terms', 'en')
   *        .addTitle('Termes Médicaux', 'fr');
   * ```
   */
  addTitle(title: string, language: LanguageTag): this {
    if (!this.lexicon.title) this.lexicon.title = [];
    this.lexicon.title.push({
      value: title,
      lang: language,
    });
    return this;
  }

  /**
   * Adds a lexical concept to the lexicon
   * @param concept - The lexical concept to add
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addConcept({
   *   id: 'concept:motion',
   *   type: 'ontolex:LexicalConcept',
   *   definition: [{ value: 'The act of moving', lang: 'en' }]
   * });
   * ```
   */
  addConcept(concept: LexicalConcept): this {
    if (!this.lexicon.concepts) this.lexicon.concepts = [];
    this.lexicon.concepts.push(concept);
    return this;
  }

  /**
   * Adds a conceptual relation to the lexicon
   * @param relation - The conceptual relation to add
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addRelation({
   *   id: 'relation:1',
   *   type: 'skos:Relation',
   *   source: 'concept:walk',
   *   target: 'concept:motion',
   *   relationType: 'skos:broader'
   * });
   * ```
   */
  addRelation(relation: ConceptualRelation): this {
    if (!this.lexicon.relations) this.lexicon.relations = [];
    this.lexicon.relations.push(relation);
    return this;
  }

  /**
   * Adds or updates a namespace mapping
   * @param prefix - Namespace prefix
   * @param uri - Namespace URI
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addNamespace('med', 'http://example.com/medical#')
   *        .addNamespace('bio', 'http://example.com/biology#');
   * ```
   */
  addNamespace(prefix: string, uri: string): this {
    if (!this.lexicon.namespaces)
      this.lexicon.namespaces = { ...DEFAULT_NAMESPACES };
    this.lexicon.namespaces[prefix] = uri;
    return this;
  }

  /**
   * Sets all namespace mappings at once
   * @param namespaces - Complete namespace mapping object
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.setNamespaces({
   *   ...DEFAULT_NAMESPACES,
   *   custom: 'http://example.com/custom#'
   * });
   * ```
   */
  setNamespaces(namespaces: NamespaceMap): this {
    this.lexicon.namespaces = namespaces;
    return this;
  }

  /**
   * Sets the creation date (useful when importing historical data)
   * @param date - Creation date
   * @returns This builder instance for method chaining
   */
  setCreatedDate(date: Date): this {
    this.lexicon.created = date;
    return this;
  }

  /**
   * Gets the current number of entries in the lexicon
   * @returns Number of entries
   *
   * @example
   * ```typescript
   * console.log(`Lexicon has ${builder.getEntryCount()} entries`);
   * ```
   */
  getEntryCount(): number {
    return this.lexicon.entries?.length || 0;
  }

  /**
   * Gets all languages represented in the lexicon
   * @returns Array of language codes
   */
  getLanguages(): LanguageTag[] {
    return [...(this.lexicon.language || [])];
  }

  /**
   * Checks if the lexicon contains entries for a specific language
   * @param language - Language code to check
   * @returns True if the language is present
   */
  hasLanguage(language: LanguageTag): boolean {
    return this.lexicon.language?.includes(language) || false;
  }

  /**
   * Removes all entries from the lexicon
   * @returns This builder instance for method chaining
   */
  clearEntries(): this {
    this.lexicon.entries = [];
    return this;
  }

  /**
   * Filters entries by a predicate function
   * @param predicate - Function that returns true for entries to keep
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * // Keep only verbs
   * builder.filterEntries(entry =>
   *   entry.partOfSpeech?.includes(PartOfSpeech.VERB) || false
   * );
   * ```
   */
  filterEntries(predicate: (entry: LexicalEntry) => boolean): this {
    if (this.lexicon.entries) {
      this.lexicon.entries = this.lexicon.entries.filter(predicate);
    }
    return this;
  }

  /**
   * Sorts entries by a comparison function
   * @param compareFn - Function to compare two entries
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * // Sort alphabetically by canonical form
   * builder.sortEntries((a, b) =>
   *   a.canonicalForm.writtenRep[0].value.localeCompare(
   *     b.canonicalForm.writtenRep[0].value
   *   )
   * );
   * ```
   */
  sortEntries(compareFn: (a: LexicalEntry, b: LexicalEntry) => number): this {
    if (this.lexicon.entries) {
      this.lexicon.entries.sort(compareFn);
    }
    return this;
  }

  /**
   * Builds the final Lexicon object
   * @returns The completed Lexicon
   *
   * @throws {Error} If required fields are missing
   *
   * @example
   * ```typescript
   * const lexicon = builder
   *   .addEntry(entry1)
   *   .addEntry(entry2)
   *   .setVersion('1.0.0')
   *   .build();
   * ```
   */
  build(): Lexicon {
    if (!this.lexicon.language || this.lexicon.language.length === 0) {
      throw new Error("Lexicon must have at least one language");
    }

    this.lexicon.modified = new Date();
    return this.lexicon as Lexicon;
  }
}
