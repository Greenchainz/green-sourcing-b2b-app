import { redirect } from 'next/navigation';

export async function GET(request) {
  // Debug: Log what we're using
  console.log('CLOUD_INSTANCE:', process.env.CLOUD_INSTANCE);
  console.log('TENANT_ID:', process.env.TENANT_ID);
  console.log('CLIENT_ID:', process.env.CLIENT_ID);
  console.log('REDIRECT_URI:', process.env.REDIRECT_URI);
  
  const authCodeUrl = process.env.CLOUD_INSTANCE + process.env.TENANT_ID + '/oauth2/v2.0/authorize?' + new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.REDIRECT_URI,
    response_mode: 'query',
    scope: 'openid profile User.Read',
    state: '12345'
  });
  
  console.log('Generated auth URL:', authCodeUrl);
  
  return redirect(authCodeUrl);
}
