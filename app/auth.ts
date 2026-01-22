import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import sql from "mssql"

// 1. Configure Azure SQL Connection (Safe Mode)
const sqlConfig = {
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  database: process.env.AZURE_SQL_DB,
  server: process.env.AZURE_SQL_SERVER!, // e.g., 'greenchainz.database.windows.net'
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: { encrypt: true, trustServerCertificate: false }
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
      // We map the Azure "App Roles" to our internal logic here
      authorization: { params: { scope: "openid profile email User.Read" } },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email) return false;
      
      try {
        // Connect to Azure SQL
        const pool = await sql.connect(sqlConfig);
        
        // 1. Check if user exists in our Master USERS table
        const result = await pool.request()
          .input('email', sql.NVarChar, user.email)
          .query('SELECT UserID, Role FROM Users WHERE Email = @email');

        let userRole = 'Architect'; // Default role

        if (result.recordset.length === 0) {
          // NEW USER: We need to determine their role.
          // For now, we default to "Architect" (Buyer). 
          // Real logic: Check if they were invited as a Supplier?
          
          await pool.request()
            .input('email', sql.NVarChar, user.email)
            .input('name', sql.NVarChar, user.name)
            .input('entraId', sql.NVarChar, user.id)
            .query(`
              INSERT INTO Users (Email, FullName, Role, EntraID, CreatedAt)
              VALUES (@email, @name, 'Architect', @entraId, GETDATE())
            `);
            
          // Also add to the "Architects" specific table
          await pool.request()
             .input('email', sql.NVarChar, user.email)
             .query(`INSERT INTO Architects (Email, Status) VALUES (@email, 'Active')`);

        } else {
          // EXISTING USER: Update their login timestamp
          userRole = result.recordset[0].Role;
          await pool.request()
            .input('email', sql.NVarChar, user.email)
            .query('UPDATE Users SET LastLogin = GETDATE() WHERE Email = @email');
        }
        
        return true;
      } catch (err) {
        console.error("Azure SQL Login Error:", err);
        return false; // Block login if DB is down
      }
    },
    async session({ session, token }) {
      // Pass the UserID and Role to the frontend
      // session.user.role = token.role 
      return session;
    },
    async jwt({ token, user }) {
        // If we want to persist the role in the token, we'd add it here
        return token;
    }
  },
  pages: {
    signIn: '/login', // Your custom login page
  }
})
