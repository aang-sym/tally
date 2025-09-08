#!/usr/bin/env node

/**
 * Process Schema CSV Files
 * Converts exported CSV files into structured schema documentation
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] === 'null' ? null : values[index];
    });
    return obj;
  });
  return rows;
}

function postgresTypeToTypeScript(pgType) {
  const typeMap = {
    'uuid': 'string',
    'character varying': 'string',
    'text': 'string',
    'integer': 'number',
    'bigint': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'boolean': 'boolean',
    'date': 'string', // ISO date string
    'timestamp without time zone': 'string', // ISO timestamp string
    'timestamp with time zone': 'string', // ISO timestamp string
    'json': 'any', // Could be more specific
    'jsonb': 'any', // Could be more specific
    'ARRAY': 'any[]'
  };
  
  return typeMap[pgType] || 'any';
}

async function processSchemaCSVs() {
  console.log('🔍 Processing schema CSV files...');

  try {
    const schemaDir = path.join(__dirname, '../migrations/schema');
    
    // Read CSV files
    const [query1Content, query2Content, query3Content] = await Promise.all([
      fs.readFile(path.join(schemaDir, 'query_1.csv'), 'utf-8'),
      fs.readFile(path.join(schemaDir, 'query_2.csv'), 'utf-8'),
      fs.readFile(path.join(schemaDir, 'query_3.csv'), 'utf-8')
    ]);

    // Parse CSV data
    const tableColumns = parseCSV(query1Content);
    const foreignKeys = parseCSV(query2Content);
    const constraints = parseCSV(query3Content);

    console.log(`📊 Parsed ${tableColumns.length} columns, ${foreignKeys.length} foreign keys, ${constraints.length} constraints`);

    // Group columns by table
    const tablesByName = {};
    tableColumns.forEach(col => {
      if (!tablesByName[col.table_name]) {
        tablesByName[col.table_name] = {
          name: col.table_name,
          columns: [],
          primaryKeys: [],
          foreignKeys: [],
          uniqueConstraints: [],
          indexes: []
        };
      }
      
      tablesByName[col.table_name].columns.push({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        maxLength: col.character_maximum_length,
        precision: col.numeric_precision,
        position: parseInt(col.ordinal_position),
        tsType: postgresTypeToTypeScript(col.data_type)
      });
    });

    // Add foreign key relationships
    foreignKeys.forEach(fk => {
      if (tablesByName[fk.table_name]) {
        tablesByName[fk.table_name].foreignKeys.push({
          column: fk.column_name,
          referencedTable: fk.foreign_table_name,
          referencedColumn: fk.foreign_column_name,
          constraintName: fk.constraint_name
        });
      }
    });

    // Add constraints
    constraints.forEach(constraint => {
      if (tablesByName[constraint.table_name]) {
        const table = tablesByName[constraint.table_name];
        
        switch (constraint.constraint_type) {
          case 'PRIMARY KEY':
            if (!table.primaryKeys.includes(constraint.column_name)) {
              table.primaryKeys.push(constraint.column_name);
            }
            break;
          case 'UNIQUE':
            const uniqueConstraint = table.uniqueConstraints.find(uc => uc.name === constraint.constraint_name);
            if (uniqueConstraint) {
              uniqueConstraint.columns.push(constraint.column_name);
            } else {
              table.uniqueConstraints.push({
                name: constraint.constraint_name,
                columns: [constraint.column_name]
              });
            }
            break;
        }
      }
    });

    // Sort columns by position
    Object.values(tablesByName).forEach(table => {
      table.columns.sort((a, b) => a.position - b.position);
    });

    const schema = {
      generated_at: new Date().toISOString(),
      source: 'supabase_csv_export',
      tables: tablesByName,
      summary: {
        tableCount: Object.keys(tablesByName).length,
        totalColumns: tableColumns.length,
        totalForeignKeys: foreignKeys.length,
        totalConstraints: constraints.length
      }
    };

    // Save JSON schema
    const schemaPath = path.join(__dirname, '../docs/database-schema.json');
    await fs.mkdir(path.dirname(schemaPath), { recursive: true });
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Generate markdown documentation
    await generateMarkdownDocs(schema);

    // Generate TypeScript interfaces
    await generateTypeScriptInterfaces(schema);

    console.log('✅ Schema processing complete!');
    console.log(`📄 JSON schema: ${schemaPath}`);
    console.log(`📖 Markdown docs: ${path.join(__dirname, '../docs/DATABASE_SCHEMA.md')}`);
    console.log(`📝 TypeScript types: ${path.join(__dirname, '../src/types/database.ts')}`);

    // Print summary
    console.log('\n📊 Database Summary:');
    Object.entries(schema.summary).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    return schema;

  } catch (error) {
    console.error('❌ Schema processing failed:', error);
    throw error;
  }
}

async function generateMarkdownDocs(schema) {
  const docs = [];
  
  docs.push('# Database Schema Documentation\n');
  docs.push(`Generated: ${schema.generated_at}\n`);
  docs.push(`Source: ${schema.source}\n`);
  
  docs.push(`## Summary\n`);
  docs.push(`- **Tables**: ${schema.summary.tableCount}`);
  docs.push(`- **Total Columns**: ${schema.summary.totalColumns}`);
  docs.push(`- **Foreign Keys**: ${schema.summary.totalForeignKeys}`);
  docs.push(`- **Constraints**: ${schema.summary.totalConstraints}\n`);
  
  docs.push('## Tables\n');
  
  // Sort tables alphabetically
  const sortedTables = Object.entries(schema.tables).sort(([a], [b]) => a.localeCompare(b));
  
  for (const [tableName, table] of sortedTables) {
    docs.push(`### ${tableName}\n`);
    
    if (table.primaryKeys.length > 0) {
      docs.push(`**Primary Key**: ${table.primaryKeys.join(', ')}\n`);
    }
    
    docs.push('| Column | Type | Nullable | Default | TS Type |');
    docs.push('|--------|------|----------|---------|---------|');
    
    for (const column of table.columns) {
      const type = column.maxLength ? `${column.type}(${column.maxLength})` : column.type;
      const nullable = column.nullable ? '✓' : '✗';
      const defaultValue = column.default || '-';
      docs.push(`| ${column.name} | ${type} | ${nullable} | ${defaultValue} | ${column.tsType} |`);
    }
    
    if (table.foreignKeys.length > 0) {
      docs.push('\n**Foreign Keys**:');
      for (const fk of table.foreignKeys) {
        docs.push(`- ${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`);
      }
    }
    
    if (table.uniqueConstraints.length > 0) {
      docs.push('\n**Unique Constraints**:');
      for (const uc of table.uniqueConstraints) {
        docs.push(`- ${uc.columns.join(', ')}`);
      }
    }
    
    docs.push('\n');
  }
  
  // Add relationships diagram
  docs.push('## Entity Relationships\n');
  docs.push('```mermaid');
  docs.push('erDiagram');
  
  for (const [tableName, table] of sortedTables) {
    for (const fk of table.foreignKeys) {
      docs.push(`    ${tableName} ||--o{ ${fk.referencedTable} : ${fk.column}`);
    }
  }
  
  docs.push('```\n');
  
  const docsPath = path.join(__dirname, '../docs/DATABASE_SCHEMA.md');
  await fs.writeFile(docsPath, docs.join('\n'));
}

async function generateTypeScriptInterfaces(schema) {
  const types = [];
  
  types.push('/**');
  types.push(' * Database Schema Types');
  types.push(` * Generated: ${schema.generated_at}`);
  types.push(' * DO NOT EDIT - This file is auto-generated');
  types.push(' */\n');
  
  // Sort tables alphabetically
  const sortedTables = Object.entries(schema.tables).sort(([a], [b]) => a.localeCompare(b));
  
  for (const [tableName, table] of sortedTables) {
    // Create interface name (PascalCase)
    const interfaceName = tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    types.push(`export interface ${interfaceName} {`);
    
    for (const column of table.columns) {
      const optional = column.nullable ? '?' : '';
      const type = column.nullable ? `${column.tsType} | null` : column.tsType;
      types.push(`  ${column.name}${optional}: ${type};`);
    }
    
    types.push('}\n');
  }
  
  // Add a union type of all table names
  const tableNames = Object.keys(schema.tables).map(name => `'${name}'`).join(' | ');
  types.push(`export type TableName = ${tableNames};\n`);
  
  // Add database interface
  types.push('export interface Database {');
  for (const [tableName, table] of sortedTables) {
    const interfaceName = tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    types.push(`  ${tableName}: ${interfaceName};`);
  }
  types.push('}');
  
  const typesPath = path.join(__dirname, '../src/types/database.ts');
  await fs.mkdir(path.dirname(typesPath), { recursive: true });
  await fs.writeFile(typesPath, types.join('\n'));
}

// Run the processing
processSchemaCSVs()
  .then(() => {
    console.log('\n🎉 Schema processing completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Schema processing failed:', error);
    process.exit(1);
  });