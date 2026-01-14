import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateToken } from '@/lib/auth/jwt';
import { isCorporateEmail, getTrustScoreForEmail } from '@/lib/auth/corporate-domains';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    // Azure AD Configuration
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    // Ensure this matches the URI registered in Azure Portal exactly
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/login/callback`; 

    // 1. Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id: clientId!,
      scope: 'openid profile email User.Read',
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      client_secret: clientSecret!,
    });

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Azure Token Error:', tokenData);
      return NextResponse.json({ error: 'Failed to authenticate with Azure', details: tokenData }, { status: 401 });
    }

    // 2. Fetch User Profile from Graph API
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const profile = await profileResponse.json();
    // Graph API returns: { id, displayName, givenName, surname, mail, userPrincipalName }
    const email = profile.mail || profile.userPrincipalName;

    if (!email) {
       return NextResponse.json({ error: 'No email provided by Azure' }, { status: 400 });
    }

    // 3. Find or Create User (Logic matches your docs/AUTH.md)
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
       // Check for Corporate Verification
       const isCorporate = isCorporateEmail(email);
       const trustScore = getTrustScoreForEmail(email);

       const { data: newUser, error: createError } = await supabaseAdmin
         .from('users')
         .insert({
           email,
           full_name: profile.displayName,
           role: 'architect', // Default role for corporate/enterprise logins
           email_verified: true, // Trusted from Entra
           corporate_verified: isCorporate,
           trust_score: trustScore,
           verification_method: 'azure_ad',
           linkedin_id: null // Azure doesn't provide this, keep null
         })
         .select()
         .single();

       if (createError) {
         console.error('User Creation Error:', createError);
         throw createError;
       }
       user = newUser;
    }

    // 4. Generate Session Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // 5. Set Cookie and Return
    const response = NextResponse.json({
        token,
        userId: user.id,
        role: user.role,
        redirectUrl: `/${user.role}/dashboard`
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Azure Callback Exception:', error);
    return NextResponse.json({ 
      error: 'Authentication failed', 
      details: error.message 
    }, { status: 500 });
  }
}
