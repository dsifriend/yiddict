/**
 * Linguistic category enumerations based on LexInfo ontology
 * @fileoverview Contains all the linguistic enums used for morphological and syntactic features
 */

/**
 * Form type classification for different representation purposes
 * Based on OntoLex-Lemon best practices for multilingual lexicons
 */
export enum FormType {
  /** The canonical/lemma form of the entry */
  CANONICAL = "canonical",
  /** An inflected grammatical form (plural, past tense, etc.) */
  INFLECTED = "inflected",
  /** Orthographic variant (alternative spelling in same script) */
  ORTHOGRAPHIC_VARIANT = "orthographic_variant",
  /** Romanization/transliteration to Latin script */
  ROMANIZATION = "romanization",
  /** Phonetic representation (not IPA, but phonemic spelling) */
  PHONETIC = "phonetic",
  /** Archaic or historical spelling */
  ARCHAIC = "archaic",
}

/**
 * Part of speech categories following LexInfo ontology
 * Used to classify lexical entries by their grammatical function
 */
export enum PartOfSpeech {
  /** Noun - a word used to identify any of a class of people, places, or things */
  NOUN = "lexinfo:noun",
  /** Verb - a word used to describe an action, state, or occurrence */
  VERB = "lexinfo:verb",
  /** Adjective - a word naming an attribute of a noun */
  ADJECTIVE = "lexinfo:adjective",
  /** Adverb - a word that modifies a verb, adjective, or other adverb */
  ADVERB = "lexinfo:adverb",
  /** Preposition - a word governing a noun or pronoun and expressing relation */
  PREPOSITION = "lexinfo:preposition",
  /** Conjunction - a word used to connect clauses or sentences */
  CONJUNCTION = "lexinfo:conjunction",
  /** Determiner - a modifying word that determines the kind of reference a noun has */
  DETERMINER = "lexinfo:determiner",
  /** Pronoun - a word that can function by itself as a noun phrase */
  PRONOUN = "lexinfo:pronoun",
  /** Interjection - an abrupt remark expressing emotion */
  INTERJECTION = "lexinfo:interjection",
  /** Particle - a function word that must be associated with another word */
  PARTICLE = "lexinfo:particle",
  /** Numeral - a word expressing a number */
  NUMERAL = "lexinfo:numeral",
  /** Proper noun - a name used for an individual person, place, or organization */
  PROPER_NOUN = "lexinfo:properNoun",
}

/**
 * Morphological patterns for word structure
 * Describes how words are formed morphologically
 */
export enum MorphologicalPattern {
  /** Stem - the main part of a word to which affixes are added */
  STEM = "lexinfo:stem",
  /** Root - the core meaningful unit of a word */
  ROOT = "lexinfo:root",
  /** Affix - a morpheme attached to a stem to form a word */
  AFFIX = "lexinfo:affix",
  /** Prefix - an affix placed before a stem */
  PREFIX = "lexinfo:prefix",
  /** Suffix - an affix placed after a stem */
  SUFFIX = "lexinfo:suffix",
  /** Infix - an affix inserted within a stem */
  INFIX = "lexinfo:infix",
  /** Circumfix - an affix with two parts placed around a stem */
  CIRCUMFIX = "lexinfo:circumfix",
}

/**
 * Grammatical gender categories
 * Used in languages that classify nouns into gender classes
 */
export enum Gender {
  /** Masculine gender */
  MASCULINE = "lexinfo:masculine",
  /** Feminine gender */
  FEMININE = "lexinfo:feminine",
  /** Neuter gender */
  NEUTER = "lexinfo:neuter",
  /** Common gender (masculine or feminine) */
  COMMON = "lexinfo:commonGender",
}

/**
 * Grammatical number categories
 * Indicates quantity distinctions in nouns, pronouns, and verbs
 */
export enum Number {
  /** Singular - one item */
  SINGULAR = "lexinfo:singular",
  /** Plural - more than one item */
  PLURAL = "lexinfo:plural",
  /** Dual - exactly two items (used in some languages) */
  DUAL = "lexinfo:dual",
}

/**
 * Grammatical case categories
 * Indicates the grammatical function of nouns and pronouns
 */
export enum Case {
  /** Nominative case - typically marks the subject */
  NOMINATIVE = "lexinfo:nominativeCase",
  /** Accusative case - typically marks the direct object */
  ACCUSATIVE = "lexinfo:accusativeCase",
  /** Genitive case - typically indicates possession */
  GENITIVE = "lexinfo:genitiveCase",
  /** Dative case - typically marks the indirect object */
  DATIVE = "lexinfo:dativeCase",
  /** Ablative case - typically indicates movement away from */
  ABLATIVE = "lexinfo:ablativeCase",
  /** Instrumental case - typically indicates the means of action */
  INSTRUMENTAL = "lexinfo:instrumentalCase",
  /** Locative case - typically indicates location */
  LOCATIVE = "lexinfo:locativeCase",
  /** Vocative case - used for addressing someone */
  VOCATIVE = "lexinfo:vocativeCase",
}

/**
 * Grammatical tense categories
 * Indicates the time of action or state described by a verb
 */
export enum Tense {
  /** Present tense - action happening now */
  PRESENT = "lexinfo:present",
  /** Past tense - action that happened before now */
  PAST = "lexinfo:past",
  /** Future tense - action that will happen later */
  FUTURE = "lexinfo:future",
  /** Imperfect tense - ongoing action in the past */
  IMPERFECT = "lexinfo:imperfect",
  /** Perfect tense - completed action */
  PERFECT = "lexinfo:perfect",
  /** Pluperfect tense - action completed before another past action */
  PLUPERFECT = "lexinfo:pluperfect",
}

/**
 * Grammatical voice categories
 * Indicates the relationship between subject and verb
 */
export enum Voice {
  /** Active voice - subject performs the action */
  ACTIVE = "lexinfo:activeVoice",
  /** Passive voice - subject receives the action */
  PASSIVE = "lexinfo:passiveVoice",
  /** Middle voice - subject both performs and is affected by the action */
  MIDDLE = "lexinfo:middleVoice",
}

/**
 * Grammatical mood categories
 * Indicates the speaker's attitude toward the action or state
 */
export enum Mood {
  /** Indicative mood - states facts or asks questions */
  INDICATIVE = "lexinfo:indicativeMood",
  /** Subjunctive mood - expresses doubt, possibility, necessity */
  SUBJUNCTIVE = "lexinfo:subjunctiveMood",
  /** Imperative mood - gives commands or makes requests */
  IMPERATIVE = "lexinfo:imperativeMood",
  /** Conditional mood - expresses hypothetical situations */
  CONDITIONAL = "lexinfo:conditionalMood",
  /** Optative mood - expresses wishes or hopes */
  OPTATIVE = "lexinfo:optativeMood",
}

/**
 * Grammatical person categories
 * Indicates the relationship between participants in an event
 */
export enum Person {
  /** First person - the speaker (I, we) */
  FIRST = "lexinfo:firstPerson",
  /** Second person - the addressee (you) */
  SECOND = "lexinfo:secondPerson",
  /** Third person - others (he, she, it, they) */
  THIRD = "lexinfo:thirdPerson",
}
