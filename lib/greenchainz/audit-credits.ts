/**
 * lib/greenchainz/audit-credits.ts
 *
 * Gating functions for the carbon audit credit system.
 * Each user has a limited number of audit credits; consuming one
 * decrements `profiles.audit_credits_remaining`.
 */

import { query } from '../pg-pool';

/**
 * Returns true when the user has at least one audit credit remaining.
 */
export async function canRunAudit(userId: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT audit_credits_remaining FROM profiles WHERE id = $1',
      [userId]
    );

    const row = result.rows[0];
    if (!row) {
      console.error('[audit-credits] Profile not found for userId:', userId);
      return false;
    }

    return (row.audit_credits_remaining ?? 0) > 0;
  } catch (err) {
    console.error('[audit-credits] Exception checking credits:', err);
    return false;
  }
}

/**
 * Decrements one audit credit for the given user.
 * Returns true on success, false if the user has no remaining credits or doesn't exist.
 */
export async function consumeAuditCredit(userId: string): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE profiles
         SET audit_credits_remaining = audit_credits_remaining - 1
       WHERE id = $1
         AND audit_credits_remaining > 0`,
      [userId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      console.error('[audit-credits] No rows updated (insufficient credits or user not found)');
      return false;
    }

    return true;
  } catch (err) {
    console.error('[audit-credits] Exception consuming credit:', err);
    return false;
  }
}
