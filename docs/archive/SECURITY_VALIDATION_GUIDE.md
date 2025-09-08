# Security Validation Guide

This guide helps you validate that all security improvements are working correctly in the Tally application.

## 🚨 CRITICAL: Prerequisites

Before running any tests, you **MUST** complete this step:

### 1. Execute Secure RLS Policies in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `/apps/api/src/db/secure-rls-policies.sql`
4. Paste and execute the SQL
5. Verify no errors occurred

This step replaces insecure `USING (true)` policies with user-specific Row Level Security.

## 🧪 Automated Security Testing

### Run the Comprehensive Test Suite

```bash
# Make the script executable (if not already)
chmod +x scripts/security-validation-tests.sh

# Run all security tests
./scripts/security-validation-tests.sh
```

The script will test:
- User signup and login
- JWT token generation and validation
- Protected endpoint access control
- Cross-user data isolation (RLS)
- Public endpoint accessibility
- Invalid token handling

### Expected Output

```
🔐 TALLY SECURITY VALIDATION TESTS
==================================

🧪 Phase 1: Authentication System Testing
✅ PASS: User 1 signup (HTTP 201)
✅ PASS: User 2 signup (HTTP 201)
✅ PASS: User login (HTTP 200)
✅ PASS: Login with wrong password should fail (HTTP 401)

🔒 Phase 2: Authorization Testing
✅ PASS: Protected endpoint without token should fail (HTTP 401)
✅ PASS: Protected endpoint with valid token (HTTP 200)
✅ PASS: Protected endpoint with invalid token should fail (HTTP 401)

🗄️ Phase 3: Database Security Testing
✅ PASS: Add show to User 1 watchlist (HTTP 200)
✅ PASS: User 2 cannot see User 1's watchlist data (RLS working)

📊 Phase 4: Public Data Access Testing
✅ PASS: Health check endpoint (HTTP 200)
✅ PASS: Shows discovery endpoint (HTTP 200)

🎉 ALL SECURITY TESTS PASSED!
Your application is secure and ready for production.
```

## 🔧 Manual Security Verification

### 1. Database Security Check

**Verify RLS Policies in Supabase:**

1. Go to **Database** → **Tables** → **users**
2. Click **RLS** tab
3. Verify policies exist like:
   - "Users can read own profile"
   - "Users can update own profile"
   - etc.

4. Check **user_shows** table has policies like:
   - "Users can access own shows"
   - "Users can add own shows"

### 2. Password Security Check

**Verify Password Hashing:**

1. Go to **Table Editor** → **users**
2. Check `password_hash` column
3. Values should start with `$2b$` (bcrypt format)
4. Should NOT be plaintext passwords

### 3. Environment Configuration Check

**Verify Secure Configuration:**

```bash
# Check API is using anon key (not service key)
grep "SUPABASE_API_KEY" apps/api/.env

# Check JWT secret is configured
grep "JWT_SECRET" apps/api/.env
```

## 🌐 Frontend Integration Testing

### Test Complete User Flow

1. **Start both servers:**
   ```bash
   npm run dev  # Starts both API and web
   ```

2. **Test signup/login in browser:**
   - Navigate to frontend (usually http://localhost:3000)
   - Test user registration
   - Test login functionality
   - Verify JWT tokens are stored
   - Test protected features work

3. **Test session management:**
   - Login as User A
   - Try to access User B's data (should fail)
   - Test logout functionality
   - Test expired token handling

## 🐛 Common Issues & Solutions

### Issue: "RLS policy violation" errors

**Solution:** 
- Ensure you executed the RLS policies SQL file
- Check that `auth.uid()` can extract user ID from JWT
- Verify JWT tokens contain correct user ID

### Issue: "Authentication service not configured" error

**Solution:**
- Check `JWT_SECRET` exists in `.env` file
- Restart the API server after adding environment variables

### Issue: Users can access other users' data

**Solution:**
- RLS policies not properly applied
- Re-run the secure RLS policies SQL
- Check Supabase is using anon key, not service key

### Issue: Public endpoints require authentication

**Solution:**
- Check server.ts route configuration
- Public routes should use `optionalAuth` middleware
- Protected routes should use `authenticateUser` middleware

## 📋 Security Checklist

Before deploying to production:

- [ ] ✅ Executed secure RLS policies in Supabase
- [ ] ✅ All automated security tests pass
- [ ] ✅ Passwords are bcrypt hashed in database
- [ ] ✅ JWT tokens work for authentication
- [ ] ✅ Users cannot access other users' data
- [ ] ✅ Protected endpoints require valid tokens
- [ ] ✅ Public endpoints work without tokens
- [ ] ✅ Invalid/expired tokens are rejected
- [ ] ✅ Frontend integration works correctly
- [ ] ✅ Session management works properly

## 🚀 Production Deployment Security

### Additional Production Requirements

1. **Use strong JWT secret:**
   ```bash
   # Generate a secure random secret
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **Enable HTTPS in production**

3. **Set secure environment variables:**
   - Never commit `.env` files
   - Use proper secret management
   - Rotate JWT secrets periodically

4. **Monitor authentication logs:**
   - Watch for unusual login patterns
   - Monitor failed authentication attempts
   - Set up alerts for security events

---

**Remember:** Security is only as strong as your weakest link. Test thoroughly and regularly!