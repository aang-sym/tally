#!/usr/bin/env node

/**
 * Database Schema Extraction Script
 * Extracts complete schema information from Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function extractDatabaseSchema() {
  console.log('🔍 Extracting database schema from Supabase...');
  
  try {
    const schema = {
      extracted_at: new Date().toISOString(),
      database_url: supabaseUrl,
      tables: {},
      relationships: [],
      indexes: [],
      policies: []
    };

    // 1. Get all tables in the public schema
    console.log('📋 Fetching table information...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (tablesError) throw tablesError;

    console.log(`Found ${tables.length} tables:`, tables.map(t => t.table_name).join(', '));

    // 2. For each table, get column information
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`🔍 Analyzing table: ${tableName}`);

      // Get columns
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select(`
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          ordinal_position
        `)
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (columnsError) throw columnsError;

      // Get constraints (primary keys, foreign keys, etc.)
      const { data: constraints, error: constraintsError } = await supabase.rpc('get_table_constraints', { 
        table_name: tableName 
      }).then(result => ({ data: [], error: null })) // Fallback if function doesn't exist
      .catch(() => ({ data: [], error: null }));

      // Store table information
      schema.tables[tableName] = {
        name: tableName,
        type: table.table_type,
        columns: columns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          maxLength: col.character_maximum_length,
          precision: col.numeric_precision,
          scale: col.numeric_scale,
          position: col.ordinal_position
        })),
        constraints: constraints?.data || [],
        sample_data: null // Will be populated below
      };

      // Get sample data (first 3 rows)
      try {
        const { data: sampleData } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);
        
        schema.tables[tableName].sample_data = sampleData;
        console.log(`  ✅ ${tableName}: ${columns.length} columns, ${sampleData?.length || 0} sample rows`);
      } catch (sampleError) {
        console.log(`  ⚠️  ${tableName}: ${columns.length} columns, couldn't fetch sample data`);
      }
    }

    // 3. Get foreign key relationships
    console.log('🔗 Fetching foreign key relationships...');
    try {
      const { data: foreignKeys } = await supabase
        .from('information_schema.key_column_usage')
        .select(`
          table_name,
          column_name,
          constraint_name,
          referenced_table_name,
          referenced_column_name
        `)
        .eq('table_schema', 'public')
        .not('referenced_table_name', 'is', null);

      schema.relationships = foreignKeys || [];
    } catch (fkError) {
      console.log('⚠️  Could not fetch foreign key relationships');
    }

    // 4. Get indexes
    console.log('📊 Fetching index information...');
    try {
      const { data: indexes } = await supabase
        .from('pg_indexes')
        .select('tablename, indexname, indexdef')
        .eq('schemaname', 'public');

      schema.indexes = indexes || [];
    } catch (indexError) {
      console.log('⚠️  Could not fetch index information');
    }

    // 5. Save schema to file
    const schemaPath = path.join(__dirname, '../docs/database-schema.json');
    await fs.mkdir(path.dirname(schemaPath), { recursive: true });
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // 6. Generate markdown documentation
    await generateMarkdownDocs(schema);

    console.log('✅ Schema extraction complete!');
    console.log(`📄 JSON schema saved to: ${schemaPath}`);
    console.log(`📖 Markdown docs saved to: ${path.join(__dirname, '../docs/DATABASE_SCHEMA.md')}`);

    // 7. Print summary
    console.log('\n📊 Database Summary:');
    console.log(`   Tables: ${Object.keys(schema.tables).length}`);
    console.log(`   Relationships: ${schema.relationships.length}`);
    console.log(`   Indexes: ${schema.indexes.length}`);

  } catch (error) {
    console.error('❌ Schema extraction failed:', error.message);
    process.exit(1);
  }
}

async function generateMarkdownDocs(schema) {
  const docs = [];
  
  docs.push('# Database Schema Documentation\n');
  docs.push(`Generated on: ${schema.extracted_at}\n`);
  docs.push(`Database: ${schema.database_url}\n`);
  
  docs.push('## Tables\n');
  
  for (const [tableName, table] of Object.entries(schema.tables)) {
    docs.push(`### ${tableName}\n`);
    
    docs.push('| Column | Type | Nullable | Default |');
    docs.push('|--------|------|----------|---------|');
    
    for (const column of table.columns) {
      const type = column.maxLength ? `${column.type}(${column.maxLength})` : column.type;
      const nullable = column.nullable ? '✓' : '✗';
      const defaultValue = column.default || '-';
      docs.push(`| ${column.name} | ${type} | ${nullable} | ${defaultValue} |`);
    }
    
    if (table.sample_data && table.sample_data.length > 0) {
      docs.push(`\n**Sample Data (${table.sample_data.length} rows):**`);
      docs.push('```json');
      docs.push(JSON.stringify(table.sample_data, null, 2));
      docs.push('```');
    }
    
    docs.push('\n');
  }
  
  if (schema.relationships.length > 0) {
    docs.push('## Relationships\n');
    docs.push('| Table | Column | References | Referenced Column |');
    docs.push('|-------|--------|------------|------------------|');
    
    for (const rel of schema.relationships) {
      docs.push(`| ${rel.table_name} | ${rel.column_name} | ${rel.referenced_table_name} | ${rel.referenced_column_name} |`);
    }
    docs.push('\n');
  }
  
  if (schema.indexes.length > 0) {
    docs.push('## Indexes\n');
    for (const index of schema.indexes) {
      docs.push(`**${index.indexname}** (${index.tablename})`);
      docs.push('```sql');
      docs.push(index.indexdef);
      docs.push('```\n');
    }
  }
  
  const docsPath = path.join(__dirname, '../docs/DATABASE_SCHEMA.md');
  await fs.writeFile(docsPath, docs.join('\n'));
}

// Run the extraction
extractDatabaseSchema();