import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { Pool } from "pg"

// 1. Configure Azure PostgreSQL Connection
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  ssl: { rejectUnauthorized: false } // Azure Flexible Server usually requires SSL
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
      authorization: { params: { scope: "openid profile email User.Read" } },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      console.log("🔥 MICROSOFT SENT US THIS EMAIL:", user.email);
      if (!user.email) return false;
      const client = await pool.connect();

      try {
        // 1. Check if user exists in 'Users' table
        // Note: We use double quotes "Users" because Postgres is case-sensitive with tables created via some tools
        const checkQuery = 'SELECT id, role FROM "Users" WHERE email = $1';
        const result = await client.query(checkQuery, [user.email]);

        if (result.rows.length === 0) {
          // NEW USER -> Default to 'Architect' (Buyer)
          const insertQuery = `
            INSERT INTO "Users" (email, full_name, role, entra_id, created_at, last_login)
            VALUES ($1, $2, 'Buyer', $3, NOW(), NOW())
            RETURNING id
          `;
          const newRec = await client.query(insertQuery, [user.email, user.name, user.id]);

          // Create empty profile in Architects table
          await client.query('INSERT INTO "Architects" (user_id) VALUES ($1)', [newRec.rows[0].id]);

        } else {
          // EXISTING USER -> Update login time
          const updateQuery = 'UPDATE "Users" SET last_login = NOW() WHERE email = $1';
          await client.query(updateQuery, [user.email]);
        }

        return true;
      } catch (err) {
        console.error("Postgres Login Error:", err);
        return false;
      } finally {
        client.release();
      }
    },
    async session({ session, token }) {
      // Pass the Entra ID to the session so we can query DB later
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
})
