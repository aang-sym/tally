import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
} from '@tally/types';
import { supabase, serviceSupabase } from '../db/supabase.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = RegisterRequestSchema.parse(req.body);

    // Check if user already exists in Supabase
    const { data: existingUser } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ValidationError('User already exists with this email');
    }

    // Create user in Supabase
    const { data: user, error } = await serviceSupabase
      .from('users')
      .insert({
        email,
        display_name: email, // Use email as initial display name
        is_test_user: true,
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
      { expiresIn: '1h' } // Token expires in 1 hour
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

    // Find user in Supabase
    const { data: user } = await serviceSupabase
      .from('users')
      .select('id, email, display_name')
      .eq('email', email)
      .single();

    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    // Password checking stubbed for now - in real app check against stored hash
    // if (password !== user.passwordHash) {
    //   throw new ValidationError('Invalid email or password');
    // }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, displayName: user.display_name || user.email },
      jwtSecret,
      { expiresIn: '1h' } // Token expires in 1 hour
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