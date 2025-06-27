# OntoLex-Lemon TypeScript Library

A comprehensive TypeScript library for working with the OntoLex-Lemon vocabulary, designed to integrate seamlessly with PostgreSQL/Supabase databases.

## Features

- **Complete OntoLex-Lemon Support**: Full implementation of W3C OntoLex-Lemon vocabulary
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Database Integration**: Ready-to-use Supabase/PostgreSQL schema and functions
- **Batch Processing**: Support for processing multiple files and merging lexicons
- **Version Control Friendly**: JSON-based serialization for easy versioning
- **Search & Query**: Full-text search capabilities with PostgreSQL integration

## Installation

```bash
npm install @yiddict/lexicon
# or
yarn add @yiddict/lexicon
```

## Quick Start

### Basic Usage

```typescript
import { LexicalEntryBuilder, PartOfSpeech } from '@yiddict/lexicon';

// Create a simple lexical entry
const entry = new LexicalEntryBuilder('run', 'en', PartOfSpeech.VERB)
  .addPronunciation('/rʌn/')
  .addSense('To move swiftly on foot')
    .addExample('She runs every morning')
    .addTranslation('correr', 'es')
  .addForm('runs', {
    person: [Person.THIRD],
    number: [GrammaticalNumber.SINGULAR],
    tense: [Tense.PRESENT]
  })
  .build();
```

### Building a Lexicon

```typescript
import { LexiconBuilder } from '@yiddict/lexicon';

const lexicon = new LexiconBuilder('en', 'My English Lexicon')
  .addEntry(entry1)
  .addEntry(entry2)
  .setVersion('1.0.0')
  .setCreator('Your Name')
  .build();
```

## Database Setup

### 1. Environment Setup

```bash
# .env
DATABASE_URL=your_db_url
```

and/or

```bash
# .env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Create Database Schema

The SQL schema is included in the package at `database/schema.sql`. Run it in your Supabase/PostgreSQL database:

```bash
# Using psql
psql $DATABASE_URL < node_modules/@yiddict/lexicon/database/schema.sql

# Using Supabase CLI
supabase db push < node_modules/@yiddict/lexicon/database/schema.sql

# Or copy to your migrations folder
cp node_modules/@yiddict/lexicon/database/schema.sql ./migrations/001_ontolex_schema.sql
```

### 3. Insert Data

```typescript
import { SupabaseLexiconManager, LexiconUtils } from '@yiddict/lexicon';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
const dbManager = new SupabaseLexiconManager(supabase);

// Insert a lexicon
const lexiconId = await dbManager.insertLexicon(lexicon);

// Search entries
const results = await dbManager.searchEntries('run', 'en');
```

## Batch Processing

### Processing Multiple Files

```typescript
import { LexiconProcessor } from '@yiddict/lexicon';

// Process a directory of JSON files
const processor = new LexiconProcessor('en', 'English Lexicon');
await processor.processDirectory('./lexicon-data');

const lexicon = processor.getLexicon();
```

### Expected Input Format

```json
{
  "word": "run",
  "language": "en",
  "partOfSpeech": "verb",
  "pronunciation": {
    "ipa": "/rʌn/",
    "audio": "https://example.com/run.mp3"
  },
  "etymology": "From Old English rinnan",
  "senses": [
    {
      "definition": "To move swiftly on foot",
      "examples": ["She runs every morning"],
      "translations": [
        { "text": "correr", "language": "es", "confidence": 0.95 }
      ]
    }
  ],
  "forms": [
    {
      "writtenRep": "runs",
      "features": {
        "person": ["lexinfo:thirdPerson"],
        "number": ["lexinfo:singular"],
        "tense": ["lexinfo:present"]
      }
    }
  ]
}
```

## Core Types and Interfaces

### LexicalEntry

Represents a word or term with all its linguistic information:

- Canonical form and inflected forms
- Multiple senses with definitions
- Pronunciation (IPA, audio)
- Etymology information
- Morphological features
- Usage information

### Form

Represents different forms of a lexical entry:

- Written representation
- Phonetic representation
- Morphological features (gender, number, case, etc.)

### LexicalSense

Represents a meaning or sense of a word:

- Definition
- Examples
- Translations
- Semantic relations (synonyms, antonyms, etc.)
- Usage restrictions

### Lexicon

Container for multiple lexical entries:

- Metadata (title, language, version)
- Collection of entries
- Namespace management

## Advanced Features

### Morphological Features

```typescript
import { Gender, Number, Case, Tense } from '@yiddict/lexicon';

const germanNoun = new LexicalEntryBuilder('Hund', 'de', PartOfSpeech.NOUN)
  .addMorphologicalFeatures({
    gender: [Gender.MASCULINE]
  })
  .addForm('Hunde', {
    number: [Number.PLURAL],
    case: [Case.NOMINATIVE]
  })
  .build();
```

### Complex Entries with Multiple Senses

```typescript
const builder = new LexicalEntryBuilder('bank', 'en', PartOfSpeech.NOUN);

// Financial institution sense
builder.addSense('A financial institution')
  .addExample('I went to the bank')
  .setSenseNumber('1');

// River bank sense  
builder.addSense('The edge of a river')
  .addExample('We sat on the bank')
  .setSenseNumber('2');

const entry = builder.build();
```

### Merging Lexicons

```typescript
// Merge multiple lexicons
const merged = LexiconUtils.mergeLexicons([lexicon1, lexicon2, lexicon3]);

// Merge by database sources
const dbManager = new SupabaseLexiconManager(supabase);
const mergedId = await dbManager.mergeLexiconsBySources(['source1', 'source2']);
```

## Database Queries

### Search Functionality

```sql
-- Search entries with similarity scoring
SELECT * FROM search_entries('run', 'en', 'verb', 50);

-- Full-text search in JSON data
SELECT * FROM lexical_entries 
WHERE data @> '{"partOfSpeech": ["lexinfo:verb"]}';
```

### Statistics and Monitoring

```sql
-- Get lexicon statistics
SELECT * FROM lexicon_stats;

-- Get source statistics
SELECT * FROM source_stats;
```

## Best Practices

### Version Control

- Store lexicons as JSON files for version control
- Use the `source` field to track file origins
- Implement incremental updates for large datasets

### Performance

- Use batch insertion functions for large datasets
- Index frequently queried fields
- Leverage PostgreSQL's JSON capabilities for complex queries

### Data Quality

- Validate entries before insertion
- Use consistent URI schemes
  - NOTE: the provided builder functions have been designed
    to provide consistent URIs through the use of UUIDv5
- Implement data validation rules

## API Reference

### Core Classes

#### LexicalEntryBuilder

- `constructor(canonicalForm, language, partOfSpeech?)`
- `addSense(definition, language?)` → `LexicalSenseBuilder`
- `addForm(writtenRep, features?)` → `this`
- `addPronunciation(ipa?, audio?)` → `this`
- `addEtymology(description, language?)` → `this`
- `addMorphologicalFeatures(features)` → `this`
- `addLabel(label, language?)` → `this`
- `setSource(source)` → `this`
- `build()` → `LexicalEntry`

#### LexicalSenseBuilder

- `addExample(example, language?)` → `this`
- `addTranslation(targetText, targetLang, confidence?)` → `this`
- `addSynonym(synonym)` → `this`
- `addUsage(usage)` → `this`
- `setSenseNumber(number)` → `this`

#### LexiconBuilder

- `constructor(language, title?)`
- `addEntry(entry)` → `this`
- `addEntries(entries)` → `this`
- `setVersion(version)` → `this`
- `setCreator(creator)` → `this`
- `build()` → `Lexicon`

#### LexiconUtils

- `toJSON(lexicon)` → `string`
- `fromJSON(json)` → `Lexicon`
- `mergeLexicons(lexicons)` → `Lexicon`
- `prepareForDatabase(lexicon)` → `DatabaseRecords`

#### SupabaseLexiconManager

- `constructor(supabaseClient)`
- `insertLexicon(lexicon)` → `Promise<string>`
- `mergeLexiconsBySources(sources)` → `Promise<string>`
- `searchEntries(term, language?, pos?, limit?)` → `Promise<any[]>`
- `getLexiconStats()` → `Promise<any[]>`
- `getSourceStats()` → `Promise<any[]>`

#### LexiconProcessor

- `constructor(language, title)`
- `processDirectory(dirPath)` → `Promise<void>`
- `processFile(filePath)` → `Promise<void>`
- `getLexicon()` → `Lexicon`

## Enumerations

### PartOfSpeech

- `NOUN`, `VERB`, `ADJECTIVE`, `ADVERB`
- `PREPOSITION`, `CONJUNCTION`, `DETERMINER`
- `PRONOUN`, `INTERJECTION`, `PARTICLE`
- `NUMERAL`, `PROPER_NOUN`

### Morphological Features

- `Gender`: `MASCULINE`, `FEMININE`, `NEUTER`, `COMMON`
- `Number`: `SINGULAR`, `PLURAL`, `DUAL`
- `Case`: `NOMINATIVE`, `ACCUSATIVE`, `GENITIVE`, `DATIVE`, etc.
- `Tense`: `PRESENT`, `PAST`, `FUTURE`, `IMPERFECT`, etc.
- `Voice`: `ACTIVE`, `PASSIVE`, `MIDDLE`
- `Mood`: `INDICATIVE`, `SUBJUNCTIVE`, `IMPERATIVE`, etc.
- `Person`: `FIRST`, `SECOND`, `THIRD`

## Examples

### Creating a Complete Wiktionary-Style Entry

```typescript
const complexEntry = new LexicalEntryBuilder('go', 'en', PartOfSpeech.VERB)
  .addPronunciation('/ɡoʊ/', 'https://example.com/go.mp3')
  .addEtymology('From Middle English gon, from Old English gān')
  
  // Sense 1: Move from one place to another
  .addSense('To move from one place to another; to proceed')
    .addExample('I go to work every day')
    .addExample('The train goes to London')
    .addTranslation('ir', 'es', 0.95)
    .addTranslation('aller', 'fr', 0.90)
    .setSenseNumber('1')
    
  // Sense 2: Leave/depart
  .addSense('To leave; to move away from')
    .addExample('I have to go now')
    .addTranslation('irse', 'es', 0.90)
    .addTranslation('partir', 'fr', 0.85)
    .setSenseNumber('2')
    
  // Inflected forms
  .addForm('goes', {
    person: [Person.THIRD],
    number: [GrammaticalNumber.SINGULAR],
    tense: [Tense.PRESENT]
  })
  .addForm('went', {
    tense: [Tense.PAST]
  })
  .addForm('gone', {
    additionalFeatures: [{
      property: 'lexinfo:participle',
      value: 'lexinfo:pastParticiple'
    }]
  })
  .addForm('going', {
    additionalFeatures: [{
      property: 'lexinfo:participle',
      value: 'lexinfo:presentParticiple'
    }]
  })
  
  .setSource('wiktionary-en')
  .build();
```

### Batch Processing Workflow

```typescript
async function processWiktionaryData() {
  console.log('Processing Wiktionary data...');
  
  // Step 1: Initialize processor
  const processor = new LexiconProcessor('en', 'Wiktionary English Lexicon');
  
  // Step 2: Process multiple batches
  const batches = [
    './data/wiktionary-a-to-c.json',
    './data/wiktionary-d-to-f.json',
    './data/wiktionary-g-to-i.json'
  ];
  
  for (const batch of batches) {
    console.log(`Processing ${batch}...`);
    await processor.processFile(batch);
  }
  
  // Step 3: Build final lexicon
  const lexicon = processor.getLexicon();
  lexicon.version = '2024.06';
  lexicon.creator = ['Wiktionary Contributors'];
  
  // Step 4: Save for version control
  await fs.writeFile(
    `./output/wiktionary-lexicon-${lexicon.version}.json`,
    LexiconUtils.toJSON(lexicon)
  );
  
  // Step 5: Insert into database
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const dbManager = new SupabaseLexiconManager(supabase);
  
  const lexiconId = await dbManager.insertLexicon(lexicon);
  console.log(`Inserted lexicon with ID: ${lexiconId}`);
  
  // Step 6: Generate statistics
  const stats = await dbManager.getLexiconStats();
  console.log(`Lexicon contains ${stats[0].entry_count} entries`);
  
  return lexiconId;
}
```

### Advanced Search and Analysis

```typescript
async function analyzeVerbForms() {
  const dbManager = new SupabaseLexiconManager(supabase);
  
  // Find all irregular verbs
  const irregularVerbs = await supabase
    .from('lexical_entries')
    .select(`
      canonical_form,
      forms!inner(written_rep, data)
    `)
    .eq('part_of_speech', ['lexinfo:verb'])
    .neq('forms.data->morphologicalFeatures->tense', ['lexinfo:present']);
  
  // Analyze morphological patterns
  const patterns = new Map();
  
  for (const verb of irregularVerbs.data) {
    const pastForms = verb.forms.filter(f => 
      f.data?.morphologicalFeatures?.tense?.includes('lexinfo:past')
    );
    
    if (pastForms.length > 0) {
      const pattern = `${verb.canonical_form} → ${pastForms[0].written_rep}`;
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }
  }
  
  console.log('Most common irregular verb patterns:');
  [...patterns.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([pattern, count]) => {
      console.log(`${pattern}: ${count} verbs`);
    });
}
```

## Migration from Other Formats

### From Wiktionary XML Dumps

```typescript
// Pseudo-code for processing Wiktionary XML
async function processWiktionaryXML(xmlPath: string) {
  const processor = new LexiconProcessor('en', 'Wiktionary XML Import');
  
  // Parse XML and extract relevant data
  const pages = parseWiktionaryXML(xmlPath);
  
  for (const page of pages) {
    if (page.namespace === 0 && !page.title.includes(':')) {
      const entryData = extractLinguisticData(page.content);
      
      if (entryData) {
        // Convert to our format and add to processor
        await processor.processEntryData(entryData, 'wiktionary-xml');
      }
    }
  }
  
  return processor.getLexicon();
}
```

### From ConceptNet

```typescript
async function importFromConceptNet(apiEndpoint: string) {
  const processor = new LexiconProcessor('mul', 'ConceptNet Import');
  
  // Fetch semantic relations from ConceptNet
  const relations = await fetchConceptNetRelations(apiEndpoint);
  
  for (const relation of relations) {
    if (relation.rel === '/r/Synonym' || relation.rel === '/r/RelatedTo') {
      const entryData = convertConceptNetToEntry(relation);
      await processor.processEntryData(entryData, 'conceptnet');
    }
  }
  
  return processor.getLexicon();
}
```

## Performance Considerations

### Large Dataset Handling

```typescript
// For very large datasets, use streaming processing
async function processLargeDataset(filePath: string) {
  const stream = fs.createReadStream(filePath);
  const processor = new LexiconProcessor('en', 'Large Dataset');
  
  let batchSize = 1000;
  let currentBatch: any[] = [];
  
  stream.on('data', (chunk) => {
    const entries = JSON.parse(chunk.toString()).entries;
    currentBatch.push(...entries);
    
    if (currentBatch.length >= batchSize) {
      // Process batch
      processor.processBatch(currentBatch);
      currentBatch = [];
    }
  });
  
  stream.on('end', () => {
    if (currentBatch.length > 0) {
      processor.processBatch(currentBatch);
    }
  });
}
```

### Database Optimization

```sql
-- Additional indexes for specific use cases
CREATE INDEX idx_entries_etymology ON lexical_entries USING GIN (to_tsvector('english', etymology));
CREATE INDEX idx_senses_examples ON lexical_senses USING GIN (examples);
CREATE INDEX idx_morphological_gender ON forms USING GIN ((data->'morphologicalFeatures'->'gender'));

-- Materialized view for faster statistics
CREATE MATERIALIZED VIEW language_statistics AS
SELECT 
  language,
  COUNT(*) as total_entries,
  COUNT(DISTINCT part_of_speech) as pos_diversity,
  AVG(array_length(part_of_speech, 1)) as avg_pos_per_entry
FROM lexical_entries
GROUP BY language;

-- Refresh the materialized view periodically
REFRESH MATERIALIZED VIEW language_statistics;
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [OntoLex-Lemon W3C Community Group](https://www.w3.org/community/ontolex/)
- [Wiktionary](https://www.wiktionary.org/) for linguistic data inspiration
- [LexInfo Ontology](http://www.lexinfo.net/) for morphological feature definitions
