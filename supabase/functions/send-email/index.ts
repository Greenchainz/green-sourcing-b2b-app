import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { Resend } from 'resend';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? 're_placeholder_key_for_testing';
const resend = new Resend(RESEND_API_KEY);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { to, subject, html } = await req.json();

    // Development mode fallback
    if (RESEND_API_KEY === 're_placeholder_key_for_testing') {
      console.log('📧 DEVELOPMENT MODE: Email Sent');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body (HTML):', html.substring(0, 200) + '...'); // Log a snippet

      return new Response(JSON.stringify({ message: 'Development mode: Email logged to console' }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      });
    }

    const { data, error } = await resend.emails.send({
      from: 'GreenChainz <hello@greenchainz.com>',
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error({ error });
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 500,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
})