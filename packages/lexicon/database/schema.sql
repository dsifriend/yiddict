-- OntoLex-Lemon PostgreSQL/Supabase Schema
-- This schema provides storage and query capabilities for OntoLex-Lemon lexicons

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For similarity search

-- Main lexicon table
CREATE TABLE IF NOT EXISTS lexicons (
    id TEXT PRIMARY KEY,
    language TEXT[] NOT NULL,
    title TEXT,
    description TEXT,
    version TEXT,
    creator TEXT[],
    license TEXT,
    created TIMESTAMPTZ DEFAULT NOW(),
    modified TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL -- Full lexicon JSON for complex queries
);

-- Lexical entries table
CREATE TABLE IF NOT EXISTS lexical_entries (
    id TEXT PRIMARY KEY,
    lexicon_id TEXT NOT NULL REFERENCES lexicons(id) ON DELETE CASCADE,
    canonical_form TEXT NOT NULL,
    language TEXT NOT NULL,
    part_of_speech TEXT[],
    pronunciation_ipa TEXT,
    etymology TEXT,
    source TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    modified_date TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL, -- Full entry JSON
    CONSTRAINT unique_entry_per_lexicon UNIQUE (id, lexicon_id)
);

-- Lexical senses table
CREATE TABLE IF NOT EXISTS lexical_senses (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL REFERENCES lexical_entries(id) ON DELETE CASCADE,
    sense_number TEXT,
    definition TEXT,
    examples TEXT[],
    translations JSONB,
    usage_info JSONB,
    data JSONB NOT NULL -- Full sense JSON
);

-- Forms table (canonical and other forms)
CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL REFERENCES lexical_entries(id) ON DELETE CASCADE,
    form_type TEXT NOT NULL CHECK (form_type IN ('canonical', 'inflected')),
    written_rep TEXT NOT NULL,
    language TEXT NOT NULL,
    phonetic_rep TEXT,
    morphological_features JSONB,
    data JSONB NOT NULL -- Full form JSON
);

-- Indexes for performance
CREATE INDEX idx_lexicons_language ON lexicons USING GIN (language);
CREATE INDEX idx_lexicons_created ON lexicons (created);
CREATE INDEX idx_lexicons_modified ON lexicons (modified);

CREATE INDEX idx_entries_lexicon ON lexical_entries (lexicon_id);
CREATE INDEX idx_entries_canonical ON lexical_entries (canonical_form);
CREATE INDEX idx_entries_language ON lexical_entries (language);
CREATE INDEX idx_entries_pos ON lexical_entries USING GIN (part_of_speech);
CREATE INDEX idx_entries_source ON lexical_entries (source);
CREATE INDEX idx_entries_canonical_trgm ON lexical_entries USING GIST (canonical_form gist_trgm_ops);
CREATE INDEX idx_entries_data ON lexical_entries USING GIN (data);

CREATE INDEX idx_senses_entry ON lexical_senses (entry_id);
CREATE INDEX idx_senses_definition_trgm ON lexical_senses USING GIST (definition gist_trgm_ops);

CREATE INDEX idx_forms_entry ON forms (entry_id);
CREATE INDEX idx_forms_written ON forms (written_rep);
CREATE INDEX idx_forms_type ON forms (form_type);

-- Function for batch lexicon insertion
CREATE OR REPLACE FUNCTION insert_lexicon_batch(lexicon_data JSONB)
RETURNS TEXT AS $$
DECLARE
    lex_id TEXT;
    entry JSONB;
    sense JSONB;
    form JSONB;
    entry_id TEXT;
BEGIN
    -- Extract lexicon ID
    lex_id := lexicon_data->>'id';
    
    -- Insert lexicon
    INSERT INTO lexicons (
        id, language, title, description, version, 
        creator, license, created, modified, data
    ) VALUES (
        lex_id,
        ARRAY(SELECT jsonb_array_elements_text(lexicon_data->'language')),
        lexicon_data->'title'->0->>'value',
        lexicon_data->'description'->0->>'value',
        lexicon_data->>'version',
        CASE 
            WHEN lexicon_data->'creator' IS NOT NULL 
            THEN ARRAY(SELECT jsonb_array_elements_text(lexicon_data->'creator'))
            ELSE NULL
        END,
        lexicon_data->>'license',
        COALESCE((lexicon_data->>'created')::TIMESTAMPTZ, NOW()),
        COALESCE((lexicon_data->>'modified')::TIMESTAMPTZ, NOW()),
        lexicon_data
    );
    
    -- Insert entries
    FOR entry IN SELECT * FROM jsonb_array_elements(lexicon_data->'entries')
    LOOP
        entry_id := entry->>'id';
        
        -- Insert lexical entry
        INSERT INTO lexical_entries (
            id, lexicon_id, canonical_form, language,
            part_of_speech, pronunciation_ipa, etymology,
            source, created_date, modified_date, data
        ) VALUES (
            entry_id,
            lex_id,
            entry->'canonicalForm'->'writtenRep'->0->>'value',
            entry->>'language',
            CASE 
                WHEN entry->'partOfSpeech' IS NOT NULL 
                THEN ARRAY(SELECT jsonb_array_elements_text(entry->'partOfSpeech'))
                ELSE NULL
            END,
            entry->'pronunciation'->>'ipa',
            entry->'etymology'->'description'->0->>'value',
            entry->>'source',
            COALESCE((entry->>'createdDate')::TIMESTAMPTZ, NOW()),
            COALESCE((entry->>'modifiedDate')::TIMESTAMPTZ, NOW()),
            entry
        );
        
        -- Insert canonical form
        INSERT INTO forms (
            id, entry_id, form_type, written_rep, language,
            phonetic_rep, morphological_features, data
        ) VALUES (
            entry->'canonicalForm'->>'id',
            entry_id,
            'canonical',
            entry->'canonicalForm'->'writtenRep'->0->>'value',
            entry->>'language',
            entry->'canonicalForm'->'phoneticRep'->0,
            entry->'canonicalForm'->'morphologicalFeatures',
            entry->'canonicalForm'
        );
        
        -- Insert other forms
        FOR form IN SELECT * FROM jsonb_array_elements(COALESCE(entry->'otherForms', '[]'::jsonb))
        LOOP
            INSERT INTO forms (
                id, entry_id, form_type, written_rep, language,
                phonetic_rep, morphological_features, data
            ) VALUES (
                form->>'id',
                entry_id,
                'inflected',
                form->'writtenRep'->0->>'value',
                entry->>'language',
                form->'phoneticRep'->0,
                form->'morphologicalFeatures',
                form
            );
        END LOOP;
        
        -- Insert senses
        FOR sense IN SELECT * FROM jsonb_array_elements(COALESCE(entry->'lexicalSenses', '[]'::jsonb))
        LOOP
            INSERT INTO lexical_senses (
                id, entry_id, sense_number, definition,
                examples, translations, usage_info, data
            ) VALUES (
                sense->>'id',
                entry_id,
                sense->>'senseNumber',
                sense->'definition'->0->>'value',
                CASE 
                    WHEN sense->'examples' IS NOT NULL 
                    THEN ARRAY(SELECT e->>'value' FROM jsonb_array_elements(sense->'examples') e)
                    ELSE NULL
                END,
                sense->'translations',
                sense->'usage',
                sense
            );
        END LOOP;
    END LOOP;
    
    RETURN lex_id;
END;
$$ LANGUAGE plpgsql;

-- Function to merge lexicons by source
CREATE OR REPLACE FUNCTION merge_lexicons_by_source(source_names TEXT[])
RETURNS TEXT AS $$
DECLARE
    merged_id TEXT;
    merged_title TEXT;
    all_languages TEXT[];
    all_creators TEXT[];
BEGIN
    -- Generate merged lexicon ID and title
    merged_id := 'urn:uuid:' || uuid_generate_v4();
    merged_title := 'Merged lexicon from sources: ' || array_to_string(source_names, ', ');
    
    -- Collect all unique languages and creators
    SELECT 
        array_agg(DISTINCT lang),
        array_agg(DISTINCT creator)
    INTO all_languages, all_creators
    FROM (
        SELECT 
            unnest(l.language) as lang,
            unnest(l.creator) as creator
        FROM lexicons l
        JOIN lexical_entries e ON e.lexicon_id = l.id
        WHERE e.source = ANY(source_names)
    ) t
    WHERE lang IS NOT NULL;
    
    -- Create merged lexicon
    INSERT INTO lexicons (
        id, language, title, version, creator, created, data
    ) VALUES (
        merged_id,
        all_languages,
        merged_title,
        'merged-' || to_char(NOW(), 'YYYY-MM-DD'),
        array_remove(all_creators, NULL),
        NOW(),
        jsonb_build_object(
            'id', merged_id,
            'type', 'lime:Lexicon',
            'language', to_jsonb(all_languages),
            'title', jsonb_build_array(jsonb_build_object('value', merged_title, 'lang', 'en')),
            'entries', '[]'::jsonb
        )
    );
    
    -- Copy entries from source lexicons
    INSERT INTO lexical_entries (
        id, lexicon_id, canonical_form, language,
        part_of_speech, pronunciation_ipa, etymology,
        source, created_date, modified_date, data
    )
    SELECT DISTINCT ON (e.canonical_form, e.language, e.source)
        e.id, 
        merged_id,
        e.canonical_form,
        e.language,
        e.part_of_speech,
        e.pronunciation_ipa,
        e.etymology,
        e.source,
        e.created_date,
        e.modified_date,
        e.data
    FROM lexical_entries e
    WHERE e.source = ANY(source_names);
    
    -- Copy related forms and senses
    INSERT INTO forms 
    SELECT f.* FROM forms f
    JOIN lexical_entries e ON f.entry_id = e.id
    WHERE e.lexicon_id = merged_id;
    
    INSERT INTO lexical_senses
    SELECT s.* FROM lexical_senses s
    JOIN lexical_entries e ON s.entry_id = e.id
    WHERE e.lexicon_id = merged_id;
    
    RETURN merged_id;
END;
$$ LANGUAGE plpgsql;

-- Function for searching entries with similarity scoring
CREATE OR REPLACE FUNCTION search_entries(
    search_term TEXT,
    lang TEXT DEFAULT NULL,
    pos TEXT DEFAULT NULL,
    limit_results INT DEFAULT 100
)
RETURNS TABLE (
    id TEXT,
    canonical_form TEXT,
    language TEXT,
    part_of_speech TEXT[],
    definition TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.canonical_form,
        e.language,
        e.part_of_speech,
        s.definition,
        similarity(e.canonical_form, search_term) as sim
    FROM lexical_entries e
    LEFT JOIN lexical_senses s ON s.entry_id = e.id 
        AND s.sense_number = '1' -- Primary sense
    WHERE 
        (lang IS NULL OR e.language = lang)
        AND (pos IS NULL OR pos = ANY(e.part_of_speech))
        AND e.canonical_form % search_term -- Trigram similarity operator
    ORDER BY sim DESC, e.canonical_form
    LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- View for lexicon statistics
CREATE OR REPLACE VIEW lexicon_stats AS
SELECT 
    l.id,
    l.title,
    l.language,
    l.version,
    COUNT(DISTINCT e.id) as entry_count,
    COUNT(DISTINCT s.id) as sense_count,
    COUNT(DISTINCT f.id) as form_count,
    l.created,
    l.modified
FROM lexicons l
LEFT JOIN lexical_entries e ON e.lexicon_id = l.id
LEFT JOIN lexical_senses s ON s.entry_id = e.id
LEFT JOIN forms f ON f.entry_id = e.id
GROUP BY l.id, l.title, l.language, l.version, l.created, l.modified;

-- View for source statistics
CREATE OR REPLACE VIEW source_stats AS
SELECT 
    e.source,
    COUNT(DISTINCT e.id) as entry_count,
    COUNT(DISTINCT e.language) as language_count,
    MIN(e.created_date) as first_created,
    MAX(e.modified_date) as last_modified
FROM lexical_entries e
WHERE e.source IS NOT NULL
GROUP BY e.source;

-- View for entries with forms (mentioned in manager.ts)
CREATE OR REPLACE VIEW entry_with_forms AS
SELECT 
    e.*,
    jsonb_agg(
        jsonb_build_object(
            'id', f.id,
            'form_type', f.form_type,
            'written_rep', f.written_rep,
            'phonetic_rep', f.phonetic_rep,
            'morphological_features', f.morphological_features
        )
    ) FILTER (WHERE f.id IS NOT NULL) as forms
FROM lexical_entries e
LEFT JOIN forms f ON f.entry_id = e.id
GROUP BY e.id, e.lexicon_id, e.canonical_form, e.language, 
         e.part_of_speech, e.pronunciation_ipa, e.etymology, 
         e.source, e.created_date, e.modified_date, e.data;

-- Update triggers for modified timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lexicons_modified BEFORE UPDATE ON lexicons
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE FUNCTION update_entry_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_date = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entries_modified BEFORE UPDATE ON lexical_entries
    FOR EACH ROW EXECUTE FUNCTION update_entry_modified_column();

-- Row Level Security (RLS) policies for Supabase
ALTER TABLE lexicons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexical_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexical_senses ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

-- Public read access (adjust based on your auth requirements)
CREATE POLICY "Public lexicons are viewable by everyone" ON lexicons
    FOR SELECT USING (true);

CREATE POLICY "Public entries are viewable by everyone" ON lexical_entries
    FOR SELECT USING (true);

CREATE POLICY "Public senses are viewable by everyone" ON lexical_senses
    FOR SELECT USING (true);

CREATE POLICY "Public forms are viewable by everyone" ON forms
    FOR SELECT USING (true);

-- Write access policies (adjust based on your auth requirements)
-- Example: authenticated users can insert
CREATE POLICY "Authenticated users can insert lexicons" ON lexicons
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert entries" ON lexical_entries
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert senses" ON lexical_senses
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert forms" ON forms
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
