import { adminProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { decisionMakerPersonas } from '../../drizzle/schema';

// Decision maker personas are internal pitch-strategy data — admin only.
export const personasRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(decisionMakerPersonas);
  }),
});
