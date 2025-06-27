/**
 * Database management for OntoLex-Lemon lexicons
 * @fileoverview Provides integration with Supabase/PostgreSQL for storing and querying lexicons
 */

import { Lexicon } from "../interfaces/ontolex";
import { LexiconUtils } from "../utils/serialization";

/**
 * Search result interface for database queries
 */
export interface SearchResult {
  /** Entry ID */
  id: string;
  /** Canonical form of the word */
  canonical_form: string;
  /** Language code */
  language: string;
  /** Parts of speech */
  part_of_speech: string[];
  /** Primary definition */
  definition: string;
  /** Similarity score (0.0 to 1.0) */
  similarity: number;
}

/**
 * Lexicon statistics from database views
 */
export interface LexiconStats {
  /** Lexicon ID */
  id: string;
  /** Lexicon title */
  title: string;
  /** Languages covered */
  language: string[];
  /** Version identifier */
  version: string;
  /** Number of entries */
  entry_count: number;
  /** Number of senses */
  sense_count: number;
  /** Number of forms */
  form_count: number;
  /** Creation date */
  created: Date;
  /** Last modification date */
  modified: Date;
}

/**
 * Source statistics from database views
 */
export interface SourceStats {
  /** Source identifier */
  source: string;
  /** Number of entries from this source */
  entry_count: number;
  /** Number of languages in this source */
  language_count: number;
  /** First creation date */
  first_created: Date;
  /** Last modification date */
  last_modified: Date;
}

/**
 * Database manager for OntoLex-Lemon lexicons using Supabase
 * Provides high-level operations for storing, retrieving, and querying lexical data
 */
export class SupabaseLexiconManager {
  /**
   * Creates a new SupabaseLexiconManager
   * @param supabase - Initialized Supabase client
   *
   * @example
   * ```typescript
   * import { createClient } from '@supabase/supabase-js';
   *
   * const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
   * const manager = new SupabaseLexiconManager(supabase);
   * ```
   */
  constructor(private supabase: any) {}

  /**
   * Inserts a complete lexicon into the database using batch processing
   * @param lexicon - The lexicon to insert
   * @returns Promise resolving to the lexicon ID
   * @throws {Error} If insertion fails
   *
   * @example
   * ```typescript
   * const lexiconId = await manager.insertLexicon(myLexicon);
   * console.log(`Inserted lexicon with ID: ${lexiconId}`);
   * ```
   */
  async insertLexicon(lexicon: Lexicon): Promise<string> {
    try {
      // Validate lexicon before insertion
      const errors = LexiconUtils.validateLexicon(lexicon);
      if (errors.length > 0) {
        throw new Error(`Lexicon validation failed: ${errors.join(", ")}`);
      }

      // Use the database function for efficient batch insertion
      const { data, error } = await this.supabase.rpc("insert_lexicon_batch", {
        lexicon_data: lexicon,
      });

      if (error) {
        throw new Error(`Database insertion failed: ${error.message}`);
      }

      console.log(`Successfully inserted lexicon with ID: ${data}`);
      return data;
    } catch (error) {
      console.error("Error inserting lexicon:", error);
      throw error;
    }
  }

  /**
   * Merges multiple lexicons from different sources into a new lexicon
   * @param sources - Array of source identifiers to merge
   * @returns Promise resolving to the new merged lexicon ID
   * @throws {Error} If merge operation fails
   *
   * @example
   * ```typescript
   * const mergedId = await manager.mergeLexiconsBySources(['wiktionary', 'wordnet', 'manual']);
   * ```
   */
  async mergeLexiconsBySources(sources: string[]): Promise<string> {
    try {
      if (sources.length === 0) {
        throw new Error("No sources provided for merging");
      }

      const { data, error } = await this.supabase.rpc(
        "merge_lexicons_by_source",
        { source_names: sources }
      );

      if (error) {
        throw new Error(`Lexicon merge failed: ${error.message}`);
      }

      console.log(`Created merged lexicon with ID: ${data}`);
      return data;
    } catch (error) {
      console.error("Error merging lexicons:", error);
      throw error;
    }
  }

  /**
   * Searches for lexical entries using full-text search with similarity scoring
   * @param searchTerm - The term to search for
   * @param language - Optional language filter
   * @param partOfSpeech - Optional part of speech filter
   * @param limit - Maximum number of results (default: 100)
   * @returns Promise resolving to array of search results
   *
   * @example
   * ```typescript
   * // Basic search
   * const results = await manager.searchEntries('run');
   *
   * // Filtered search
   * const verbs = await manager.searchEntries('run', 'en', 'lexinfo:verb', 10);
   * ```
   */
  async searchEntries(
    searchTerm: string,
    language?: string,
    partOfSpeech?: string,
    limit: number = 100
  ): Promise<SearchResult[]> {
    try {
      if (!searchTerm.trim()) {
        throw new Error("Search term cannot be empty");
      }

      const { data, error } = await this.supabase.rpc("search_entries", {
        search_term: searchTerm.trim(),
        lang: language,
        pos: partOfSpeech,
        limit_results: Math.max(1, Math.min(limit, 1000)), // Clamp between 1 and 1000
      });

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error searching entries:", error);
      throw error;
    }
  }

  /**
   * Retrieves a specific lexical entry by ID with all related data
   * @param entryId - The ID of the entry to retrieve
   * @returns Promise resolving to the entry data or null if not found
   *
   * @example
   * ```typescript
   * const entry = await manager.getEntry('entry-uuid');
   * if (entry) {
   *   console.log('Found entry:', entry.canonical_form);
   * }
   * ```
   */
  async getEntry(entryId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from("entry_with_forms")
        .select("*")
        .eq("id", entryId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = not found
        throw new Error(`Failed to retrieve entry: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error retrieving entry:", error);
      throw error;
    }
  }

  /**
   * Retrieves lexicon statistics from the database
   * @returns Promise resolving to array of lexicon statistics
   *
   * @example
   * ```typescript
   * const stats = await manager.getLexiconStats();
   * stats.forEach(stat => {
   *   console.log(`${stat.title}: ${stat.entry_count} entries`);
   * });
   * ```
   */
  async getLexiconStats(): Promise<LexiconStats[]> {
    try {
      const { data, error } = await this.supabase
        .from("lexicon_stats")
        .select("*")
        .order("entry_count", { ascending: false });

      if (error) {
        throw new Error(`Failed to retrieve lexicon stats: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error getting lexicon stats:", error);
      throw error;
    }
  }

  /**
   * Retrieves source statistics showing data from different sources
   * @returns Promise resolving to array of source statistics
   *
   * @example
   * ```typescript
   * const sourceStats = await manager.getSourceStats();
   * console.log('Data sources:');
   * sourceStats.forEach(stat => {
   *   console.log(`- ${stat.source}: ${stat.entry_count} entries`);
   * });
   * ```
   */
  async getSourceStats(): Promise<SourceStats[]> {
    try {
      const { data, error } = await this.supabase
        .from("source_stats")
        .select("*")
        .order("entry_count", { ascending: false });

      if (error) {
        throw new Error(`Failed to retrieve source stats: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error getting source stats:", error);
      throw error;
    }
  }

  /**
   * Retrieves entries by source identifier
   * @param source - Source identifier to filter by
   * @param limit - Maximum number of entries to return
   * @param offset - Number of entries to skip (for pagination)
   * @returns Promise resolving to array of entries
   *
   * @example
   * ```typescript
   * // Get first 100 entries from Wiktionary
   * const wiktionaryEntries = await manager.getEntriesBySource('wiktionary', 100, 0);
   *
   * // Get next 100 entries (pagination)
   * const nextBatch = await manager.getEntriesBySource('wiktionary', 100, 100);
   * ```
   */
  async getEntriesBySource(
    source: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from("lexical_entries")
        .select("*")
        .eq("source", source)
        .range(offset, offset + limit - 1)
        .order("canonical_form");

      if (error) {
        throw new Error(
          `Failed to retrieve entries by source: ${error.message}`
        );
      }

      return data || [];
    } catch (error) {
      console.error("Error getting entries by source:", error);
      throw error;
    }
  }

  /**
   * Retrieves entries by language
   * @param language - Language code to filter by
   * @param limit - Maximum number of entries to return
   * @param offset - Number of entries to skip (for pagination)
   * @returns Promise resolving to array of entries
   *
   * @example
   * ```typescript
   * const germanEntries = await manager.getEntriesByLanguage('de', 50);
   * ```
   */
  async getEntriesByLanguage(
    language: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from("lexical_entries")
        .select("*")
        .eq("language", language)
        .range(offset, offset + limit - 1)
        .order("canonical_form");

      if (error) {
        throw new Error(
          `Failed to retrieve entries by language: ${error.message}`
        );
      }

      return data || [];
    } catch (error) {
      console.error("Error getting entries by language:", error);
      throw error;
    }
  }

  /**
   * Updates an existing lexical entry
   * @param entryId - ID of the entry to update
   * @param updates - Partial entry data to update
   * @returns Promise resolving to the updated entry
   *
   * @example
   * ```typescript
   * await manager.updateEntry('entry-uuid', {
   *   pronunciation_ipa: '/new_pronunciation/',
   *   modified_date: new Date()
   * });
   * ```
   */
  async updateEntry(entryId: string, updates: any): Promise<any> {
    try {
      updates.modified_date = new Date();

      const { data, error } = await this.supabase
        .from("lexical_entries")
        .update(updates)
        .eq("id", entryId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update entry: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error updating entry:", error);
      throw error;
    }
  }

  /**
   * Deletes a lexicon and all its entries
   * @param lexiconId - ID of the lexicon to delete
   * @returns Promise resolving when deletion is complete
   *
   * @example
   * ```typescript
   * await manager.deleteLexicon('lexicon-uuid');
   * console.log('Lexicon deleted successfully');
   * ```
   */
  async deleteLexicon(lexiconId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("lexicons")
        .delete()
        .eq("id", lexiconId);

      if (error) {
        throw new Error(`Failed to delete lexicon: ${error.message}`);
      }

      console.log(`Successfully deleted lexicon: ${lexiconId}`);
    } catch (error) {
      console.error("Error deleting lexicon:", error);
      throw error;
    }
  }

  /**
   * Performs a health check on the database connection
   * @returns Promise resolving to true if database is accessible
   *
   * @example
   * ```typescript
   * const isHealthy = await manager.healthCheck();
   * if (!isHealthy) {
   *   console.error('Database connection failed');
   * }
   * ```
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("lexicons")
        .select("count")
        .limit(1);

      return !error;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }
}
