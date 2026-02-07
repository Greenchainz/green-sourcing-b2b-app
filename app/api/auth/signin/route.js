import { redirect } from 'next/navigation';

export async function GET(request) {
  const authCodeUrl = process.env.CLOUD_INSTANCE + process.env.TENANT_ID + '/oauth2/v2.0/authorize?' + new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.REDIRECT_URI,
    response_mode: 'query',
    scope: 'openid profile User.Read',
    state: '12345'
  });
  
  return redirect(authCodeUrl);
}
