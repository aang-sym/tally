#!/usr/bin/env node

/**
 * Database Migration Script
 * Adds password_hash column to users table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function addPasswordHashColumn() {
  console.log('🔧 Running database migration: Add password_hash column');
  
  try {
    // First, check if the column already exists
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'password_hash');
    
    if (columnError) {
      throw new Error(`Failed to check column existence: ${columnError.message}`);
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ password_hash column already exists');
      return;
    }
    
    // Since we can't run DDL directly, let's first check if we can access the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Cannot access users table:', usersError.message);
      console.log('📋 You need to manually add the password_hash column to your Supabase users table:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to the Table Editor');
      console.log('   3. Select the "users" table');
      console.log('   4. Add a new column: "password_hash" (type: text, required: true)');
      console.log('   5. Run this script again');
      return;
    }
    
    console.log('📋 Manual migration required:');
    console.log('   Since Supabase doesn\'t allow DDL operations via the client,');
    console.log('   please manually add the password_hash column to your users table:');
    console.log('');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');  
    console.log('   3. Run this SQL:');
    console.log('');
    console.log('   ALTER TABLE users ADD COLUMN password_hash TEXT;');
    console.log('   ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;');
    console.log('');
    console.log('   4. Then run this script again to verify');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
addPasswordHashColumn();