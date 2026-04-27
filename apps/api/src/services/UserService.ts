import { serviceSupabase, supabase } from '../db/supabase.js';

interface EnsureUserProfileOptions {
  email?: string | null;
  displayName?: string | null;
  isTestUser?: boolean;
}

export class UserService {
  private static deriveDisplayName(email?: string | null, displayName?: string | null): string {
    if (displayName && displayName.trim()) {
      return displayName.trim();
    }

    if (email && email.includes('@')) {
      return email.split('@')[0] || 'User';
    }

    return 'User';
  }

  private static inferTestUser(email?: string | null): boolean {
    if (!email) {
      return false;
    }

    return /test|example|tallyapp\.dev/i.test(email);
  }

  public static async ensureUserProfile(
    userId: string,
    options: EnsureUserProfileOptions = {}
  ): Promise<{ error: Error | null }> {
    if (!userId) {
      return { error: new Error('User ID cannot be empty.') };
    }

    let email = options.email ?? null;
    let displayName = options.displayName ?? null;
    let isTestUser = options.isTestUser;

    if (!email || !displayName || typeof isTestUser !== 'boolean') {
      const { data, error: authError } = await serviceSupabase.auth.admin.getUserById(userId);

      if (authError) {
        console.error(`[UserService] Failed to fetch Supabase auth user ${userId}:`, authError);
        return { error: new Error(`Failed to fetch auth user: ${authError.message}`) };
      }

      const authUser = data.user;
      if (!authUser) {
        return { error: new Error(`Auth user ${userId} not found`) };
      }

      email = email ?? authUser.email ?? null;
      displayName =
        displayName ??
        (authUser.user_metadata?.display_name as string | undefined) ??
        (authUser.user_metadata?.name as string | undefined) ??
        null;
      isTestUser =
        typeof isTestUser === 'boolean'
          ? isTestUser
          : this.inferTestUser(authUser.email ?? email ?? undefined);
    }

    if (!email) {
      return { error: new Error(`Auth user ${userId} has no email`) };
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedDisplayName = this.deriveDisplayName(normalizedEmail, displayName);
    const { data: existingUser, error: lookupError } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (lookupError) {
      console.error(`[UserService] Failed to look up user ${userId}:`, lookupError);
      return { error: new Error(`Failed to look up user: ${lookupError.message}`) };
    }

    if (existingUser) {
      const { error: updateError } = await serviceSupabase
        .from('users')
        .update({
          email: normalizedEmail,
          display_name: normalizedDisplayName,
          is_test_user: isTestUser ?? this.inferTestUser(normalizedEmail),
        })
        .eq('id', userId);

      if (updateError) {
        console.error(`[UserService] Failed to update existing user ${userId}:`, updateError);
        return { error: new Error(`Failed to update user profile: ${updateError.message}`) };
      }

      return { error: null };
    }

    const { error: insertError } = await serviceSupabase.from('users').insert({
      id: userId,
      email: normalizedEmail,
      display_name: normalizedDisplayName,
      is_test_user: isTestUser ?? this.inferTestUser(normalizedEmail),
      password_hash: 'supabase-auth-managed',
    });

    if (insertError) {
      console.error(`[UserService] Failed to insert user ${userId}:`, insertError);
      return { error: new Error(`Failed to create user profile: ${insertError.message}`) };
    }

    return { error: null };
  }

  /**
   * Ensures a user exists in the database by calling the
   * `upsert_user` database function.
   * If the user does not exist, they are created.
   * If the user already exists, their last_seen_at timestamp is updated.
   *
   * @param userId - The ID of the user to upsert.
   */
  public static async upsertUser(userId: string): Promise<{ error: Error | null }> {
    if (!userId) {
      return { error: new Error('User ID cannot be empty.') };
    }

    const { error } = await supabase
      .from('users')
      .upsert({ id: userId, last_seen_at: new Date().toISOString() }, { onConflict: 'id' });

    if (error) {
      console.error(`[UserService] Failed to upsert user ${userId}:`, error);
      return { error: new Error(`Failed to upsert user: ${error.message}`) };
    }

    return { error: null };
  }
}
