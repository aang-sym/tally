import { Router } from 'express';
import { RegisterRequestSchema, LoginRequestSchema, AuthResponseSchema } from '@tally/types';
import { serviceSupabase } from '../db/supabase.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { UserService } from '../services/UserService.js';

const router: Router = Router();
const isDev = process.env.NODE_ENV !== 'production';

async function confirmDevUserAndSignIn(email: string, password: string, userId?: string) {
  if (!isDev) {
    return null;
  }

  let targetUserId = userId;

  if (!targetUserId) {
    const { data: listedUsers, error: listUsersError } =
      await serviceSupabase.auth.admin.listUsers();

    if (listUsersError) {
      console.error('Error listing Supabase users for dev auth recovery:', listUsersError);
      return null;
    }

    targetUserId = listedUsers.users.find((candidate) => candidate.email === email)?.id;
  }

  if (!targetUserId) {
    return null;
  }

  const { error: confirmError } = await serviceSupabase.auth.admin.updateUserById(targetUserId, {
    email_confirm: true,
    password,
  });

  if (confirmError) {
    console.error('Error confirming dev user via Supabase Admin API:', confirmError);
    return null;
  }

  const loginResult = await serviceSupabase.auth.signInWithPassword({ email, password });
  if (loginResult.error || !loginResult.data.session || !loginResult.data.user) {
    console.error('Error signing in confirmed dev user:', loginResult.error);
    return null;
  }

  return loginResult.data;
}

async function ensureAppUserOrThrow(user: { id: string; email?: string | null }) {
  const syncResult = await UserService.ensureUserProfile(user.id, {
    email: user.email ?? null,
  });

  if (syncResult.error) {
    console.error('Failed to sync app user profile after auth:', syncResult.error);
    throw new ValidationError(
      'Authenticated successfully, but failed to prepare the app user profile'
    );
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = RegisterRequestSchema.parse(req.body);

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const { data, error } = await serviceSupabase.auth.signUp({ email, password });

    if (error) {
      const normalizedMessage = error.message.toLowerCase();

      if (normalizedMessage.includes('already registered')) {
        throw new ValidationError('User already exists with this email');
      }

      if (
        isDev &&
        (normalizedMessage.includes('rate limit') ||
          normalizedMessage.includes('email not confirmed'))
      ) {
        const recovered = await confirmDevUserAndSignIn(email, password);
        if (recovered?.session && recovered.user) {
          const response = AuthResponseSchema.parse({
            success: true,
            token: recovered.session.access_token,
            user: {
              id: recovered.user.id,
              email: recovered.user.email,
            },
          });

          return res.status(201).json(response);
        }
      }

      if (normalizedMessage.includes('unregistered api key')) {
        throw new ValidationError(
          'Supabase is misconfigured: the API key in apps/api/.env is not valid for this project'
        );
      }

      console.error('Error creating user via Supabase Auth:', error);
      throw new ValidationError(error.message || 'Failed to create user');
    }

    let session = data.session;
    let user = data.user;

    if (!session && user && isDev) {
      const recovered = await confirmDevUserAndSignIn(email, password, user.id);
      if (recovered?.session && recovered.user) {
        session = recovered.session;
        user = recovered.user;
      }
    }

    if (!session || !user) {
      throw new ValidationError(
        'Registration succeeded but no session returned — check email confirmation settings'
      );
    }

    await ensureAppUserOrThrow(user);

    const response = AuthResponseSchema.parse({
      success: true,
      token: session.access_token,
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

    const { data, error } = await serviceSupabase.auth.signInWithPassword({ email, password });

    if (error) {
      const normalizedMessage = error.message.toLowerCase();

      if (isDev && normalizedMessage.includes('email not confirmed')) {
        const recovered = await confirmDevUserAndSignIn(email, password);
        if (recovered?.session && recovered.user) {
          const response = AuthResponseSchema.parse({
            success: true,
            token: recovered.session.access_token,
            user: {
              id: recovered.user.id,
              email: recovered.user.email,
            },
          });

          return res.json(response);
        }
      }

      if (normalizedMessage.includes('unregistered api key')) {
        throw new ValidationError(
          'Supabase is misconfigured: the API key in apps/api/.env is not valid for this project'
        );
      }

      throw new ValidationError(error.message || 'Invalid email or password');
    }

    if (!data.session || !data.user) {
      throw new ValidationError('Invalid email or password');
    }

    await ensureAppUserOrThrow(data.user);

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
