import { Router } from 'express';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
} from '@tally/types';
import { userStore } from '../storage/index.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = RegisterRequestSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await userStore.findByEmail(email);
    if (existingUser) {
      throw new ValidationError('User already exists with this email');
    }

    // Create user (password hashing stubbed for now)
    const user = await userStore.create(email, password);

    const response = AuthResponseSchema.parse({
      success: true,
      token: `stub_token_${user.id}`, // In real app: generate JWT
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

    // Find user
    const user = await userStore.findByEmail(email);
    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    // Check password (stubbed - in real app: await bcrypt.compare(password, user.passwordHash))
    if (password !== user.passwordHash) {
      throw new ValidationError('Invalid email or password');
    }

    const response = AuthResponseSchema.parse({
      success: true,
      token: `stub_token_${user.id}`, // In real app: generate JWT
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