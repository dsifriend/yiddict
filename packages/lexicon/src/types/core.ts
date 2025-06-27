/**
 * Core OntoLex-Lemon types and interfaces
 * @fileoverview Defines the fundamental types used throughout the OntoLex-Lemon vocabulary
 */

/** Base namespace mapping for RDF prefixes */
export interface NamespaceMap {
  [prefix: string]: string;
}

/** Default W3C and OntoLex namespaces */
export const DEFAULT_NAMESPACES: NamespaceMap = {
  ontolex: "http://www.w3.org/ns/lemon/ontolex#",
  decomp: "http://www.w3.org/ns/lemon/decomp#",
  synsem: "http://www.w3.org/ns/lemon/synsem#",
  lime: "http://www.w3.org/ns/lemon/lime#",
  lexinfo: "http://www.lexinfo.net/ontology/3.0/lexinfo#",
  lemon: "http://lemon-model.net/lemon#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  dc: "http://purl.org/dc/elements/1.1/",
  dcterms: "http://purl.org/dc/terms/",
  owl: "http://www.w3.org/2002/07/owl#",
};

/** URI identifier type for RDF resources */
export type URI = string;

/** Language tag following BCP 47 standard (e.g., 'en', 'de-DE') */
export type LanguageTag = string;

/** Literal value that can be stored in RDF */
export type LiteralValue = string | number | boolean;

/**
 * String with language information
 * Used for multilingual text content
 */
export interface LangString {
  /** The text content */
  value: string;
  /** Language tag identifying the language */
  lang: LanguageTag;
}

/**
 * RDF literal with optional datatype and language
 * Represents typed data in the semantic web context
 */
export interface Literal {
  /** The literal value */
  value: LiteralValue;
  /** Optional datatype URI for the literal */
  datatype?: URI;
  /** Optional language tag for string literals */
  lang?: LanguageTag;
}
