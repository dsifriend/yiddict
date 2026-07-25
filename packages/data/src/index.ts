/**
 * Shared types for source adapter results.
 * Used by all source adapters to report parser-drift checks and build statistics.
 */

/**
 * Statistics collected during source parsing and Etrog lexicon construction.
 * Reports counts used for parser-drift detection and validation.
 */
export interface AdapterStats {
  /** Number of raw input records/items processed from the source. */
  inputCount: number;

  /** Number of Etrog entries created and added to the lexicon. */
  emittedEntryCount: number;

  /** Number of Etrog senses created across all entries. */
  emittedSenseCount: number;

  /** Number of input records rejected, ignored, or skipped during parsing. */
  rejectedCount: number;
}

/**
 * Result of a source adapter build operation.
 * Encompasses the built Etrog lexicon and associated statistics.
 *
 * @template T The type of the built lexicon artifact.
 */
export interface AdapterResult<T> {
  /** The constructed Etrog lexicon as a compacted JSON-LD artifact. */
  lexicon: T;

  /** Parser-drift and build statistics for validation and reporting. */
  stats: AdapterStats;
}

/**
 * Default/convenience type for adapter results using generic JSON structure.
 * Adapters can specialize this for more precise lexicon typing.
 */
export type GenericAdapterResult = AdapterResult<Record<string, unknown>>;
