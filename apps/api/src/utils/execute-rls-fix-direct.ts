#!/usr/bin/env node
/**
 * Direct RLS Fix Execution
 * 
 * Executes the RLS policy fix directly through Supabase client
 * since psql connection is blocked.
 */

import { serviceSupabase } from '../db/supabase.js';

const SQL_COMMANDS = [
  `DROP POLICY IF EXISTS "Public can read shows" ON shows;`,
  `DROP POLICY IF EXISTS "Authenticated can delete shows" ON shows;`,
  `DROP POLICY IF EXISTS "Authenticated can update shows" ON shows;`,
  `DROP POLICY IF EXISTS "Authenticated can manage shows" ON shows;`,
  `DROP POLICY IF EXISTS "Service and authenticated can manage shows" ON shows;`,
  `CREATE POLICY "Public can read shows" ON shows FOR SELECT USING (true);`,
  `CREATE POLICY "Authenticated can insert shows" ON shows FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);`,
  `CREATE POLICY "Authenticated can update shows" ON shows FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);`,
  `CREATE POLICY "Authenticated can delete shows" ON shows FOR DELETE USING (auth.uid() IS NOT NULL);`
];

async function executeRLSFixDirect() {
  console.log('🔧 Executing RLS Fix Direct...\n');
  
  try {
    for (const [index, sql] of SQL_COMMANDS.entries()) {
      console.log(`[${index + 1}/${SQL_COMMANDS.length}] ${sql.substring(0, 50)}...`);
      
      const { data, error } = await serviceSupabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        // Continue with other commands
      } else {
        console.log('   ✅ Success');
      }
    }
    
    // Verify the fix
    console.log('\n📋 Verifying policies...');
    const { data: policies, error: policyError } = await serviceSupabase
      .rpc('exec_sql', { 
        sql: `SELECT schemaname, tablename, policyname, cmd, permissive, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shows' ORDER BY policyname;`
      });
    
    if (policies && !policyError) {
      console.log('✅ Current policies on shows table:');
      console.log(JSON.stringify(policies, null, 2));
    } else {
      console.log('⚠️  Could not retrieve policies for verification');
    }
    
    console.log('\n🎉 RLS fix execution completed!');
    
  } catch (error) {
    console.error('❌ Direct execution failed:', error);
    
    console.log('\n📋 Manual execution required:');
    console.log('Copy and paste these commands into Supabase SQL Editor:');
    console.log('----------------------------------------');
    SQL_COMMANDS.forEach(sql => {
      console.log(sql);
    });
    console.log('----------------------------------------');
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  executeRLSFixDirect()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Direct execution script failed:', error);
      process.exit(1);
    });
}

export { executeRLSFixDirect };