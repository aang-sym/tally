import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Migration 011_add_user_shows_fields.sql', () => {
  // Vitest CWD is apps/api; avoid duplicating path segments
  const migrationPath = path.resolve(
    process.cwd(),
    'src/db/migrations/011_add_user_shows_fields.sql'
  );

  it('file exists', () => {
    const exists = fs.existsSync(migrationPath);
    expect(exists).toBe(true);
  });

  it('contains expected ALTER TABLE statements and RLS policy', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Columns
    expect(sql).toMatch(/ALTER TABLE\s+user_shows/i);
    expect(sql).toMatch(/ADD COLUMN\s+buffer_days\s+INTEGER\s+DEFAULT\s+0/i);
    expect(sql).toMatch(/ADD COLUMN\s+country_code\s+TEXT/i);
    expect(sql).toMatch(/ADD COLUMN\s+streaming_provider_id\s+INTEGER/i);

    // Policy drop/create
    expect(sql).toMatch(/DROP POLICY IF EXISTS\s+user_shows_update_own\s+ON\s+user_shows/i);
    expect(sql).toMatch(/CREATE POLICY\s+user_shows_update_own\s+ON\s+user_shows\s+FOR UPDATE/i);
    expect(sql).toMatch(/USING\s*\(\s*user_id\s*=\s*auth\.uid\(\)\s*\)/i);
  });
});
