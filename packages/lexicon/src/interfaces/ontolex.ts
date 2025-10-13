/**
 * Core OntoLex-Lemon interfaces
 * @fileoverview Defines the main OntoLex-Lemon vocabulary classes and their properties
 */

import { URI, LangString, LanguageTag, NamespaceMap } from "../types/core";
import {
  PartOfSpeech,
  MorphologicalPattern,
  FormType,
} from "../enums/linguistic";
import {
  MorphologicalFeatures,
  Pronunciation,
  Etymology,
  Usage,
} from "./linguistic";

/**
 * Translation information linking to other languages
 * Used within lexical senses to provide cross-lingual mappings
 */
export interface Translation {
  /** URI of the target lexical entry or sense */
  target: URI;
  /** Language code of the target translation */
  targetLang: LanguageTag;
  /** Text of the translation */
  targetText: string;
  /** Confidence score for the translation (0.0 to 1.0) */
  confidence?: number;
  /** Source of the translation (manual, automatic, etc.) */
  source?: string;
}

/**
 * Extended Form interface with form type classification
 */
export interface Form {
  /** Unique identifier for this form */
  id: URI;
  /** RDF type identifier */
  type: "ontolex:Form";
  /** Written representations in different scripts or orthographies */
  writtenRep: LangString[];
  /** Phonetic representations (IPA, etc.) */
  phoneticRep?: string[];
  /** Morphological features specific to this form */
  morphologicalFeatures?: MorphologicalFeatures;
  /** Pronunciation information for this specific form */
  pronunciation?: Pronunciation;
  /** Classification of what kind of form this is */
  formType?: FormType;
  /** Optional descriptive label for the form */
  formLabel?: LangString[];
}

/**
 * OntoLex LexicalSense - represents a meaning or sense of a lexical entry
 * Each sense corresponds to a distinct meaning that the word can have
 */
export interface LexicalSense {
  /** Unique identifier for this sense */
  id: URI;
  /** RDF type identifier */
  type: "ontolex:LexicalSense";
  /** Definition(s) of this sense in different languages */
  definition?: LangString[];
  /** URI references to external concepts or resources */
  reference?: URI[];
  /** Subsenses that are more specific instances of this sense */
  subsenses?: LexicalSense[];
  /** References to lexicalized senses in other resources */
  lexicalizedSense?: URI[];
  /** Usage restrictions and context for this sense */
  usage?: Usage;
  /** Example sentences demonstrating this sense */
  examples?: LangString[];
  /** Translations of this sense to other languages */
  translations?: Translation[];
  /** Words with similar meaning */
  synonyms?: URI[];
  /** Words with opposite meaning */
  antonyms?: URI[];
  /** Words with broader meaning (superordinates) */
  hypernyms?: URI[];
  /** Words with narrower meaning (subordinates) */
  hyponyms?: URI[];
  /** Part-whole relationships (parts) */
  meronyms?: URI[];
  /** Part-whole relationships (wholes) */
  holonyms?: URI[];
  /** Other semantically related terms */
  relatedTerms?: URI[];
  /** Sense number for ordering (e.g., "1", "2a", "3.1") */
  senseNumber?: string;
}

/**
 * OntoLex Component - used for morphological decomposition
 * Represents parts of complex words (compounds, derivatives)
 */
export interface Component {
  /** Unique identifier for this component */
  id: URI;
  /** RDF type identifier */
  type: "decomp:Component";
  /** Lexical entry that this component corresponds to */
  correspondsTo?: URI;
  /** Position of this component within the word */
  position?: number;
}

/**
 * OntoLex LexicalEntry - the main class representing a word or lexical unit
 * This is the central entity that connects forms, senses, and linguistic information
 */
export interface LexicalEntry {
  /** Unique identifier for this lexical entry */
  id: URI;
  /** RDF type identifier */
  type: "ontolex:LexicalEntry";
  /** The canonical (base) form of this entry */
  canonicalForm: Form;
  /** Additional inflected or variant forms */
  otherForms?: Form[];
  /** The different senses/meanings of this entry */
  lexicalSenses?: LexicalSense[];
  /** Part(s) of speech classification */
  partOfSpeech?: PartOfSpeech[];
  /** Morphological pattern(s) of word formation */
  morphologicalPattern?: MorphologicalPattern[];
  /** Etymology and historical information */
  etymology?: Etymology;
  /** Pronunciation information */
  pronunciation?: Pronunciation;
  /** Usage restrictions and context */
  usage?: Usage;
  /** Morphological decomposition into components */
  decomposition?: Component[];
  /** Morphological features that apply to the entire entry */
  morphologicalFeatures?: MorphologicalFeatures;
  /** Descriptive labels (archaic, informal, etc.) */
  labels?: LangString[];
  /** Additional comments or notes */
  comments?: LangString[];
  /** References to related resources */
  seeAlso?: URI[];
  /** Translation relationships to entries in other languages */
  isTranslationOf?: URI[];
  /** Primary language of this entry */
  language: LanguageTag;
  /** Creator or contributor information */
  createdBy?: string;
  /** Creation timestamp */
  createdDate?: Date;
  /** Last modification timestamp */
  modifiedDate?: Date;
  /** Source identifier for batch processing and version control */
  source?: string;
}

/**
 * OntoLex LexicalConcept - represents abstract concepts that lexical entries denote
 * Used for semantic organization and cross-lingual concept mapping
 */
export interface LexicalConcept {
  /** Unique identifier for this concept */
  id: URI;
  /** RDF type identifier */
  type: "ontolex:LexicalConcept";
  /** Definition(s) of this concept */
  definition?: LangString[];
  /** Broader (more general) concepts */
  broader?: URI[];
  /** Narrower (more specific) concepts */
  narrower?: URI[];
  /** Related concepts */
  related?: URI[];
}

/**
 * SKOS ConceptualRelation - represents semantic relationships between concepts
 * Used to model ontological relationships in the lexicon
 */
export interface ConceptualRelation {
  /** Unique identifier for this relation */
  id: URI;
  /** RDF type identifier */
  type: "skos:Relation";
  /** Source concept of the relation */
  source: URI;
  /** Target concept of the relation */
  target: URI;
  /** Type of relationship (broader, narrower, related, etc.) */
  relationType: URI;
}

/**
 * LIME Lexicon - the top-level container for lexical entries
 * Represents a complete lexical resource with metadata
 */
export interface Lexicon {
  /** Unique identifier for this lexicon */
  id: URI;
  /** RDF type identifier */
  type: "lime:Lexicon";
  /** Language(s) covered by this lexicon */
  language: LanguageTag[];
  /** All lexical entries in this lexicon */
  entries: LexicalEntry[];
  /** Concepts used in this lexicon */
  concepts?: LexicalConcept[];
  /** Semantic relations between concepts */
  relations?: ConceptualRelation[];
  /** Title(s) of the lexicon */
  title?: LangString[];
  /** Description(s) of the lexicon */
  description?: LangString[];
  /** License under which the lexicon is published */
  license?: URI;
  /** Creator(s) of the lexicon */
  creator?: string[];
  /** Creation timestamp */
  created?: Date;
  /** Last modification timestamp */
  modified?: Date;
  /** Version identifier */
  version?: string;
  /** Namespace declarations for RDF serialization */
  namespaces?: NamespaceMap;
}
