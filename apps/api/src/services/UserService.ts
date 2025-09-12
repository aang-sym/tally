import { supabase } from '../db/supabase.js';

export class UserService {
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
