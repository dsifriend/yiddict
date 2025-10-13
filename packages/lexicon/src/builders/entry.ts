/**
 * Builder classes for constructing OntoLex-Lemon lexical entries
 * @fileoverview Provides fluent API for building complex lexical entries with all linguistic information
 */

import { v5 as uuidv5 } from "uuid";
import { URI, LanguageTag, LangString } from "../types/core";
import {
  PartOfSpeech,
  MorphologicalPattern,
  FormType,
} from "../enums/linguistic";
import {
  MorphologicalFeatures,
  Etymology,
  Usage,
} from "../interfaces/linguistic";
import {
  LexicalEntry,
  Form,
  LexicalSense,
  Translation,
} from "../interfaces/ontolex";

/**
 * Builder for constructing LexicalSense objects
 * Provides a fluent API for adding examples, translations, and semantic relations
 */
export class LexicalSenseBuilder {
  /**
   * Creates a new LexicalSenseBuilder
   * @param sense - The sense object being built
   */
  constructor(private sense: LexicalSense) {}

  /**
   * Adds an example sentence demonstrating this sense
   * @param example - The example text
   * @param language - Language of the example (defaults to 'en')
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addExample('She runs every morning', 'en')
   *        .addExample('Elle court chaque matin', 'fr');
   * ```
   */
  addExample(example: string, language?: LanguageTag): this {
    if (!this.sense.examples) this.sense.examples = [];
    this.sense.examples.push({
      value: example,
      lang: language || "en",
    });
    return this;
  }

  /**
   * Adds a translation of this sense to another language
   * @param targetText - The translated text
   * @param targetLang - Language code of the translation
   * @param confidence - Optional confidence score (0.0 to 1.0)
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addTranslation('correr', 'es', 0.95)
   *        .addTranslation('courir', 'fr', 0.90);
   * ```
   */
  addTranslation(
    targetText: string,
    targetLang: LanguageTag,
    confidence?: number
  ): this {
    if (!this.sense.translations) this.sense.translations = [];
    this.sense.translations.push({
      target: `urn:uuid:${uuidv5(targetText, this.sense.id)}`,
      targetLang,
      targetText,
      confidence,
    });
    return this;
  }

  /**
   * Adds a synonym (word with similar meaning)
   * @param synonym - URI of the synonym lexical entry or sense
   * @returns This builder instance for method chaining
   */
  addSynonym(synonym: URI): this {
    if (!this.sense.synonyms) this.sense.synonyms = [];
    this.sense.synonyms.push(synonym);
    return this;
  }

  /**
   * Adds an antonym (word with opposite meaning)
   * @param antonym - URI of the antonym lexical entry or sense
   * @returns This builder instance for method chaining
   */
  addAntonym(antonym: URI): this {
    if (!this.sense.antonyms) this.sense.antonyms = [];
    this.sense.antonyms.push(antonym);
    return this;
  }

  /**
   * Adds a hypernym (word with broader meaning)
   * @param hypernym - URI of the hypernym lexical entry or sense
   * @returns This builder instance for method chaining
   */
  addHypernym(hypernym: URI): this {
    if (!this.sense.hypernyms) this.sense.hypernyms = [];
    this.sense.hypernyms.push(hypernym);
    return this;
  }

  /**
   * Adds a hyponym (word with narrower meaning)
   * @param hyponym - URI of the hyponym lexical entry or sense
   * @returns This builder instance for method chaining
   */
  addHyponym(hyponym: URI): this {
    if (!this.sense.hyponyms) this.sense.hyponyms = [];
    this.sense.hyponyms.push(hyponym);
    return this;
  }

  /**
   * Sets usage restrictions and context for this sense
   * @param usage - Usage information object
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addUsage({
   *   register: ['lexinfo:formal'],
   *   domain: ['lexinfo:medical'],
   *   frequency: 0.7
   * });
   * ```
   */
  addUsage(usage: Usage): this {
    this.sense.usage = usage;
    return this;
  }

  /**
   * Sets the sense number for ordering multiple senses
   * @param number - Sense number (e.g., "1", "2a", "3.1")
   * @returns This builder instance for method chaining
   */
  setSenseNumber(number: string): this {
    this.sense.senseNumber = number;
    return this;
  }

  /**
   * Adds a subsense that is more specific than this sense
   * @param definition - Definition of the subsense
   * @param language - Language of the definition
   * @returns A new LexicalSenseBuilder for the subsense
   */
  addSubsense(definition: string, language?: LanguageTag): LexicalSenseBuilder {
    if (!this.sense.subsenses) this.sense.subsenses = [];

    const subsense: LexicalSense = {
      id: `urn:uuid:${uuidv5(definition, this.sense.id)}`,
      type: "ontolex:LexicalSense",
      definition: [{ value: definition, lang: language || "en" }],
      examples: [],
      translations: [],
    };

    this.sense.subsenses.push(subsense);
    return new LexicalSenseBuilder(subsense);
  }
}

/**
 * Builder for constructing LexicalEntry objects
 * Provides a fluent API for building complete lexical entries with forms, senses, and linguistic metadata
 */
export class LexicalEntryBuilder {
  private entry: LexicalEntry;

  /**
   * Creates a new LexicalEntryBuilder
   * @param canonicalForm - The base form of the word
   * @param language - Language code (e.g., 'en', 'de')
   * @param partOfSpeech - Optional part of speech classification
   *
   * @example
   * ```typescript
   * const builder = new LexicalEntryBuilder('run', 'en', PartOfSpeech.VERB);
   * ```
   */
  constructor(
    canonicalForm: string,
    language: LanguageTag,
    partOfSpeech?: PartOfSpeech
  ) {
    const entryId = `urn:uuid:${uuidv5(canonicalForm, language)}`;
    const canonicalFormId = `urn:uuid:${uuidv5(canonicalForm, entryId)}`;

    this.entry = {
      id: entryId,
      type: "ontolex:LexicalEntry",
      canonicalForm: {
        id: canonicalFormId,
        type: "ontolex:Form",
        writtenRep: [{ value: canonicalForm, lang: language }],
      },
      language,
      lexicalSenses: [],
      otherForms: [],
      partOfSpeech: partOfSpeech ? [partOfSpeech] : undefined,
      createdDate: new Date(),
    };
  }

  /**
   * Adds a new sense (meaning) to this lexical entry
   * @param definition - The definition text
   * @param language - Language of the definition (defaults to entry language)
   * @returns A LexicalSenseBuilder for adding more information to the sense
   *
   * @example
   * ```typescript
   * builder.addSense('To move swiftly on foot')
   *        .addExample('She runs every morning')
   *        .addTranslation('correr', 'es');
   * ```
   */
  addSense(definition: string, language?: LanguageTag): LexicalSenseBuilder {
    const sense: LexicalSense = {
      id: `urn:uuid:${uuidv5(definition, this.entry.id)}`,
      type: "ontolex:LexicalSense",
      definition: [
        { value: definition, lang: language || this.entry.language! },
      ],
      examples: [],
      translations: [],
    };

    if (!this.entry.lexicalSenses) this.entry.lexicalSenses = [];
    this.entry.lexicalSenses.push(sense);

    return new LexicalSenseBuilder(sense);
  }

  /**
   * Adds an inflected or variant form of this lexical entry
   * @param writtenRep - The written representation of the form
   * @param features - Optional morphological features of this form
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addForm('runs', {
   *   person: [Person.THIRD],
   *   number: [Number.SINGULAR],
   *   tense: [Tense.PRESENT]
   * });
   * ```
   */
  addForm(writtenRep: string, features?: MorphologicalFeatures): this {
    const form: Form = {
      id: `urn:uuid:${uuidv5(writtenRep, this.entry.id)}`,
      type: "ontolex:Form",
      writtenRep: [{ value: writtenRep, lang: this.entry.language! }],
      morphologicalFeatures: features,
    };

    if (!this.entry.otherForms) this.entry.otherForms = [];
    this.entry.otherForms.push(form);
    return this;
  }

  /**
   * Adds an inflected or variant form with explicit type classification
   * @param writtenRep - The written representation of the form
   * @param formType - Classification of what kind of form this is
   * @param features - Optional morphological features of this form
   * @param label - Optional descriptive label
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addTypedForm('shney', FormType.ROMANIZATION)
   *        .addTypedForm('שנײ', FormType.CANONICAL);
   * ```
   */
  addTypedForm(
    writtenRep: string,
    formType: FormType,
    features?: MorphologicalFeatures,
    label?: string
  ): this {
    const form: Form = {
      id: `urn:uuid:${uuidv5(writtenRep + formType, this.entry.id)}`,
      type: "ontolex:Form",
      writtenRep: [{ value: writtenRep, lang: this.entry.language! }],
      morphologicalFeatures: features,
      formType,
      formLabel: label ? [{ value: label, lang: "en" }] : undefined,
    };

    if (!this.entry.otherForms) this.entry.otherForms = [];
    this.entry.otherForms.push(form);
    return this;
  }

  /**
   * Sets multiple written representations for the canonical form
   * Useful for languages with multiple scripts or spelling conventions
   *
   * @param representations - Array of written representations with language tags
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.setCanonicalWrittenReps([
   *   { value: 'שניי', lang: 'yi' },      // Yiddish script
   *   { value: 'shney', lang: 'yi-Latn' } // Romanized Yiddish
   * ]);
   * ```
   */
  setCanonicalWrittenReps(representations: LangString[]): this {
    this.entry.canonicalForm.writtenRep = representations;
    return this;
  }

  /**
   * Adds pronunciation information to this entry
   * @param ipa - International Phonetic Alphabet transcription
   * @param audio - Optional URI to audio file
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addPronunciation('/rʌn/', 'https://example.com/run.mp3');
   * ```
   */
  addPronunciation(ipa?: string, audio?: URI): this {
    if (!this.entry.pronunciation) this.entry.pronunciation = {};
    if (ipa) this.entry.pronunciation.ipa = ipa;
    if (audio) this.entry.pronunciation.audio = audio;
    return this;
  }

  /**
   * Adds etymology (word origin) information
   * @param description - Description of the word's etymology
   * @param language - Language of the description (defaults to entry language)
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addEtymology('From Old English rinnan', 'en');
   * ```
   */
  addEtymology(description: string, language?: LanguageTag): this {
    if (!this.entry.etymology) this.entry.etymology = {};
    if (!this.entry.etymology.description)
      this.entry.etymology.description = [];
    this.entry.etymology.description.push({
      value: description,
      lang: language || this.entry.language!,
    });
    return this;
  }

  /**
   * Sets morphological features that apply to the entire entry
   * @param features - Morphological feature object
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addMorphologicalFeatures({
   *   gender: [Gender.MASCULINE],
   *   number: [Number.SINGULAR]
   * });
   * ```
   */
  addMorphologicalFeatures(features: MorphologicalFeatures): this {
    this.entry.morphologicalFeatures = features;
    return this;
  }

  /**
   * Adds a descriptive label to this entry
   * @param label - The label text (e.g., 'informal', 'archaic')
   * @param language - Language of the label (defaults to entry language)
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addLabel('informal', 'en')
   *        .addLabel('obsolete', 'en');
   * ```
   */
  addLabel(label: string, language?: LanguageTag): this {
    if (!this.entry.labels) this.entry.labels = [];
    this.entry.labels.push({
      value: label,
      lang: language || this.entry.language!,
    });
    return this;
  }

  /**
   * Adds a comment or note about this entry
   * @param comment - The comment text
   * @param language - Language of the comment (defaults to entry language)
   * @returns This builder instance for method chaining
   */
  addComment(comment: string, language?: LanguageTag): this {
    if (!this.entry.comments) this.entry.comments = [];
    this.entry.comments.push({
      value: comment,
      lang: language || this.entry.language!,
    });
    return this;
  }

  /**
   * Adds an additional part of speech classification
   * @param pos - Part of speech enum value
   * @returns This builder instance for method chaining
   */
  addPartOfSpeech(pos: PartOfSpeech): this {
    if (!this.entry.partOfSpeech) this.entry.partOfSpeech = [];
    this.entry.partOfSpeech.push(pos);
    return this;
  }

  /**
   * Adds a morphological pattern classification
   * @param pattern - Morphological pattern enum value
   * @returns This builder instance for method chaining
   */
  addMorphologicalPattern(pattern: MorphologicalPattern): this {
    if (!this.entry.morphologicalPattern) this.entry.morphologicalPattern = [];
    this.entry.morphologicalPattern.push(pattern);
    return this;
  }

  /**
   * Sets usage information for this entry
   * @param usage - Usage restrictions and context
   * @returns This builder instance for method chaining
   */
  setUsage(usage: Usage): this {
    this.entry.usage = usage;
    return this;
  }

  /**
   * Sets the source identifier for batch processing and version control
   * @param source - Source identifier (e.g., filename, database name)
   * @returns This builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.setSource('wiktionary-en-2024')
   *        .setSource('manual-entry');
   * ```
   */
  setSource(source: string): this {
    this.entry.source = source;
    return this;
  }

  /**
   * Sets the creator of this entry
   * @param creator - Creator name or identifier
   * @returns This builder instance for method chaining
   */
  setCreatedBy(creator: string): this {
    this.entry.createdBy = creator;
    return this;
  }

  /**
   * Adds a reference to a related resource
   * @param uri - URI of the related resource
   * @returns This builder instance for method chaining
   */
  addSeeAlso(uri: URI): this {
    if (!this.entry.seeAlso) this.entry.seeAlso = [];
    this.entry.seeAlso.push(uri);
    return this;
  }

  /**
   * Marks this entry as a translation of another entry
   * @param translationOf - URI of the source entry
   * @returns This builder instance for method chaining
   */
  addTranslationOf(translationOf: URI): this {
    if (!this.entry.isTranslationOf) this.entry.isTranslationOf = [];
    this.entry.isTranslationOf.push(translationOf);
    return this;
  }

  /**
   * Builds the final LexicalEntry object
   * @returns The completed LexicalEntry
   *
   * @throws {Error} If required fields are missing
   */
  build(): LexicalEntry {
    if (!this.entry.canonicalForm) {
      throw new Error("LexicalEntry must have a canonical form");
    }
    if (!this.entry.language) {
      throw new Error("LexicalEntry must have a language");
    }

    this.entry.modifiedDate = new Date();
    return this.entry as LexicalEntry;
  }
}
