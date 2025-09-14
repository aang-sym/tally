import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { RegisterRequestSchema, LoginRequestSchema, AuthResponseSchema } from '@tally/types';
import { serviceSupabase } from '../db/supabase.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router: Router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = RegisterRequestSchema.parse(req.body);

    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Check if user already exists in Supabase
    const { data: existingUser } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ValidationError('User already exists with this email');
    }

    // Hash the password
    const saltRounds = 12; // Higher than default for better security
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in Supabase
    const { data: user, error } = await serviceSupabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        display_name: email, // Use email as initial display name
        is_test_user: false, // Remove test user flag for production
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user in Supabase:', error);
      throw new ValidationError('Failed to create user');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, displayName: user.display_name || user.email },
      jwtSecret,
      { expiresIn: '7d' } // Token expires in 7 days for better UX
    );

    const response = AuthResponseSchema.parse({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
      },
    });

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginRequestSchema.parse(req.body);

    // Find user in Supabase - include password_hash for verification
    const { data: user, error } = await serviceSupabase
      .from('users')
      .select('id, email, display_name, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new ValidationError('Invalid email or password');
    }

    // Verify password against stored hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new ValidationError('Invalid email or password');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, displayName: user.display_name || user.email },
      jwtSecret,
      { expiresIn: '7d' } // Token expires in 7 days for better UX
    );

    const response = AuthResponseSchema.parse({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
      },
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
