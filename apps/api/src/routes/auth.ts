import { Router } from 'express';
import { RegisterRequestSchema, LoginRequestSchema, AuthResponseSchema } from '@tally/types';
import { serviceSupabase } from '../db/supabase.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router: Router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = RegisterRequestSchema.parse(req.body);

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const { data, error } = await serviceSupabase.auth.signUp({ email, password });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        throw new ValidationError('User already exists with this email');
      }
      console.error('Error creating user via Supabase Auth:', error);
      throw new ValidationError('Failed to create user');
    }

    if (!data.session || !data.user) {
      throw new ValidationError(
        'Registration succeeded but no session returned — check email confirmation settings'
      );
    }

    const response = AuthResponseSchema.parse({
      success: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
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

    const { data, error } = await serviceSupabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      throw new ValidationError('Invalid email or password');
    }

    const response = AuthResponseSchema.parse({
      success: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
