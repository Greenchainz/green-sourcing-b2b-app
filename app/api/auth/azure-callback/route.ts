import { NextResponse } from 'next/server'
import { query, getClient } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-replace-in-prod'
const JWT_EXPIRY = '7d' // Token valid for 7 days

function generateJWT(userId: number | string, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, firstName, lastName, azureId } = body

    if (!email || !azureId) {
      return NextResponse.json({ error: 'Email and Azure ID are required' }, { status: 400 })
    }

    // Get a database client for transaction
    const client = await getClient()
    
    try {
      await client.query('BEGIN')

      // Check if user exists by azure_id or email
      const userCheck = await client.query(
        'SELECT UserID, Email, Role FROM Users WHERE azure_id = $1 OR Email = $2',
        [azureId, email]
      )

      let userId: number | string
      let userRole: string

      if (userCheck.rows.length > 0) {
        // User exists - update last login and azure_id if not set
        const user = userCheck.rows[0]
        userId = user.userid
        userRole = user.role?.toLowerCase() || 'architect'

        await client.query(
          `UPDATE Users 
           SET LastLogin = NOW(), 
               UpdatedAt = NOW(), 
               azure_id = COALESCE(azure_id, $2),
               first_name = COALESCE(first_name, $3),
               last_name = COALESCE(last_name, $4)
           WHERE UserID = $1`,
          [userId, azureId, firstName || null, lastName || null]
        )
      } else {
        // Create new user - default role is 'architect' (buyer)
        const insertResult = await client.query(
          `INSERT INTO Users (Email, FirstName, LastName, first_name, last_name, azure_id, Role, OAuthProvider, CreatedAt, UpdatedAt, LastLogin)
           VALUES ($1, $2, $3, $2, $3, $4, 'architect', 'azure', NOW(), NOW(), NOW())
           RETURNING UserID, Role`,
          [email, firstName || null, lastName || null, azureId]
        )

        userId = insertResult.rows[0].userid
        userRole = insertResult.rows[0].role?.toLowerCase() || 'architect'
      }

      await client.query('COMMIT')

      // Generate JWT token
      const token = generateJWT(userId, email, userRole)

      // Create refresh token (valid for 30 days)
      const refreshToken = jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: '30d' }
      )

      // Store refresh token in database
      await query(
        `INSERT INTO RefreshTokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())
         ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '30 days'`,
        [userId, refreshToken]
      )

      return NextResponse.json({
        token,
        refreshToken,
        user: {
          id: userId,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          fullName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null,
          role: userRole,
          oauthProvider: 'azure'
        }
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Azure callback error:', errorMessage)
    return NextResponse.json({ 
      error: 'Authentication failed', 
      details: errorMessage 
    }, { status: 500 })
  }
}
