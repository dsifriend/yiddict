/**
 * Linguistic feature interfaces for OntoLex-Lemon
 * @fileoverview Defines interfaces for morphological, phonetic, etymological, and usage information
 */

import { URI, Literal, LangString, LanguageTag } from "../types/core";
import {
  Gender,
  Number,
  Case,
  Tense,
  Voice,
  Mood,
  Person,
} from "../enums/linguistic";

/**
 * A morpho-syntactic property with its value
 * Used for custom linguistic features not covered by standard enums
 */
export interface MorphoSyntacticProperty {
  /** URI identifying the property type */
  property: URI;
  /** The value of the property, either a URI or literal */
  value: URI | Literal;
}

/**
 * Complete morphological feature set for a word form
 * Contains all possible morphological information that can be encoded
 */
export interface MorphologicalFeatures {
  /** Grammatical gender(s) - can be multiple for some words */
  gender?: Gender[];
  /** Grammatical number(s) - singular, plural, dual */
  number?: Number[];
  /** Grammatical case(s) - nominative, accusative, etc. */
  case?: Case[];
  /** Tense information for verbs */
  tense?: Tense[];
  /** Voice information for verbs */
  voice?: Voice[];
  /** Mood information for verbs */
  mood?: Mood[];
  /** Person information for verbs and pronouns */
  person?: Person[];
  /** Degree for adjectives and adverbs (comparative, superlative) */
  degree?: URI[];
  /** Additional custom morphological features */
  additionalFeatures?: MorphoSyntacticProperty[];
}

/**
 * Pronunciation and phonetic information
 * Captures various forms of pronunciation data
 */
export interface Pronunciation {
  /** International Phonetic Alphabet transcription */
  ipa?: string;
  /** Pronunciation hint using custom transliteration conventions */
  hint?: string;
  /** URI to audio pronunciation file */
  audio?: URI;
  /** Rhyme pattern or rhyming information */
  rhyme?: string;
  /** Syllable structure or count */
  syllables?: string;
  /** Stress pattern information */
  stress?: string;
  /** Words that sound the same (homophones) */
  homophone?: string[];
}

/**
 * Etymology and historical information
 * Tracks the historical development and origin of words
 */
export interface Etymology {
  /** Textual description of the word's etymology */
  description?: LangString[];
  /** URIs to source words or etymological references */
  source?: URI[];
  /** Related words in other languages (cognates) */
  cognates?: URI[];
  /** Languages from which this word was borrowed */
  borrowedFrom?: LanguageTag[];
  /** Words from which this word was derived */
  derivedFrom?: URI[];
}

/**
 * Usage restrictions and context information
 * Describes when and how a word is typically used
 */
export interface Usage {
  /** Register level (formal, informal, technical, etc.) */
  register?: URI[];
  /** Domain or field of use (medical, legal, computing, etc.) */
  domain?: URI[];
  /** Geographic region where used */
  region?: URI[];
  /** Frequency of use (0.0 to 1.0 scale) */
  frequency?: number;
  /** Temporal usage (archaic, obsolete, modern, etc.) */
  temporal?: URI[];
  /** Stylistic markers (colloquial, slang, poetic, etc.) */
  stylistic?: URI[];
}
