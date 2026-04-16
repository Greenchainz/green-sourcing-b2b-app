import { publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { decisionMakerPersonas } from '../../drizzle/schema';

export const personasRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(decisionMakerPersonas);
  }),
});
