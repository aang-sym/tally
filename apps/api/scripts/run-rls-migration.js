#!/usr/bin/env node

/**
 * RLS Normalization Migration Script
 * Executes the RLS normalization migration for user_shows table
 */

import { serviceSupabase } from '../src/db/supabase.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runRlsMigration() {
  console.log('🔧 Running RLS Normalization Migration for user_shows table');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../src/db/migrations/012_normalize_user_shows_rls.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Executing migration SQL...');
    
    // Execute the migration SQL using the service role client
    const { data, error } = await serviceSupabase.rpc('exec_sql', {
      sql_query: migrationSql
    });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ RLS normalization migration completed successfully');
    console.log('📊 Migration result:', data);
    
    // Verify the policies were created correctly
    console.log('🔍 Verifying RLS policies...');
    
    const { data: policies, error: policyError } = await serviceSupabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'user_shows');
    
    if (policyError) {
      console.warn('⚠️  Could not verify policies:', policyError.message);
    } else {
      console.log(`✅ Found ${policies?.length || 0} policies for user_shows table`);
      policies?.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration script failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runRlsMigration();