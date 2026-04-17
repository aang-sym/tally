import { API_ENDPOINTS, apiRequest } from '../config/api';

interface AuthSuccess {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

const ALREADY_EXISTS_PATTERNS = ['already exists', 'already registered', 'user already exists'];

const INVALID_CREDENTIALS_PATTERNS = ['invalid email or password', 'invalid login credentials'];

const normalizeAuthError = (error: unknown, fallback: string): Error => {
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.trim();

  if (normalized === 'VALIDATIONERROR' || normalized === 'VALIDATION_ERROR') {
    return new Error(fallback);
  }

  if (INVALID_CREDENTIALS_PATTERNS.some((pattern) => normalized.toLowerCase().includes(pattern))) {
    return new Error('That test account exists, but the stored password did not work.');
  }

  return new Error(normalized || fallback);
};

const register = async (email: string, password: string): Promise<AuthSuccess> => {
  return await apiRequest(API_ENDPOINTS.auth.signup, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

const login = async (email: string, password: string): Promise<AuthSuccess> => {
  return await apiRequest(API_ENDPOINTS.auth.login, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const ensureDevUserSession = async (
  email: string,
  password: string
): Promise<AuthSuccess> => {
  try {
    return await register(email, password);
  } catch (registerError) {
    const message =
      registerError instanceof Error ? registerError.message.toLowerCase() : String(registerError);

    if (!ALREADY_EXISTS_PATTERNS.some((pattern) => message.includes(pattern))) {
      throw normalizeAuthError(registerError, 'Unable to create the test account.');
    }
  }

  try {
    return await login(email, password);
  } catch (loginError) {
    throw normalizeAuthError(loginError, 'Unable to sign in to the test account.');
  }
};
