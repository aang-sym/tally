#!/usr/bin/env node
/**
 * Generate Test JWT Token
 * Creates a properly signed JWT token for testing authentication flow
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET =
  process.env.JWT_SECRET || 'dev-secret-key-for-tally-security-tests-2025-9f8a7b6c5d';

const payload = {
  sub: 'b3686973-ba60-4405-8525-f8d6b3dcb7fc',
  userId: 'b3686973-ba60-4405-8525-f8d6b3dcb7fc',
  email: 'test@test.com',
  displayName: 'Test User',
  aud: 'authenticated',
  role: 'authenticated',
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

console.log('Generated JWT Token:');
console.log(token);
console.log('\nUse this token in the Authorization header as:');
console.log(`Bearer ${token}`);
