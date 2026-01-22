import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import sql from "mssql"

// Azure SQL Connection Config (Server-side only)
const sqlConfig = {
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  database: process.env.AZURE_SQL_DB,
  server: process.env.AZURE_SQL_SERVER!, 
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: { encrypt: true, trustServerCertificate: false } // True for Azure
};

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
      if (!user.email) return false;
      try {
        // Connect to Azure SQL
        const pool = await sql.connect(sqlConfig);
        
        // Check/Create User Logic
        const result = await pool.request()
          .input('email', sql.NVarChar, user.email)
          .query('SELECT UserID, Role FROM Users WHERE Email = @email');

        if (result.recordset.length === 0) {
          // New User -> Default to 'Architect' (Buyer)
          await pool.request()
            .input('email', sql.NVarChar, user.email)
            .input('name', sql.NVarChar, user.name)
            .input('entraId', sql.NVarChar, user.id)
            .query(`
              INSERT INTO Users (Email, FullName, Role, OAuthID, LastLogin)
              VALUES (@email, @name, 'Buyer', @entraId, GETDATE())
            `);
        } else {
          // Update Login Time
          await pool.request()
            .input('email', sql.NVarChar, user.email)
            .query('UPDATE Users SET LastLogin = GETDATE() WHERE Email = @email');
        }
        return true;
      } catch (err) {
        console.error("Azure SQL Login Error:", err);
        return false; 
      }
    },
    async session({ session, token }) {
      // Pass UserID to session if needed
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
