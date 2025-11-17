import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { render } from '@react-email/render';

// Import all email templates
import WelcomeEmail from '../../../emails/templates/WelcomeEmail.tsx';
import WelcomeSupplierPendingEmail from '../../../emails/templates/WelcomeSupplierPendingEmail.tsx';
import SupplierApprovedEmail from '../../../emails/templates/SupplierApprovedEmail.tsx';
import RFQConfirmationEmail from '../../../emails/templates/RFQConfirmationEmail.tsx';
import NewRFQNotification from '../../../emails/templates/NewRFQNotification.tsx';
import SupplierQuoteResponse from '../../../emails/templates/SupplierQuoteResponse.tsx';
import ProductApprovalEmail from '../../../emails/templates/ProductApprovalEmail.tsx';
import PasswordResetEmail from '../../../emails/templates/PasswordResetEmail.tsx';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { emailType, payload } = await req.json();

    let subject = '';
    let emailHtml = '';

    switch (emailType) {
      case 'buyer-welcome':
        subject = 'Welcome to GreenChainz – Your Green Material Sourcing Starts Here';
        emailHtml = render(WelcomeEmail(payload));
        break;
      case 'supplier-welcome-pending':
        subject = 'Welcome to GreenChainz – Your Application is Under Review';
        emailHtml = render(WelcomeSupplierPendingEmail(payload));
        break;
      case 'supplier-approved':
        subject = 'Your GreenChainz Supplier Account is Now Active';
        emailHtml = render(SupplierApprovedEmail(payload));
        break;
      case 'buyer-rfq-confirmation':
        subject = `Your Quote Request Has Been Sent to ${payload.supplierCompany}`;
        emailHtml = render(RFQConfirmationEmail(payload));
        break;
      case 'supplier-new-rfq':
        subject = `New Quote Request from ${payload.buyerCompany} for ${payload.productName}`;
        emailHtml = render(NewRFQNotification(payload));
        break;
      case 'buyer-quote-response':
        subject = `${payload.supplierCompany} Has Sent You a Quote for ${payload.productName}`;
        emailHtml = render(SupplierQuoteResponse(payload));
        break;
      case 'supplier-product-approved':
        subject = `Your Product "${payload.productName}" is Now Live on GreenChainz`;
        emailHtml = render(ProductApprovalEmail(payload));
        break;
      case 'password-reset':
        subject = 'Reset Your GreenChainz Password';
        emailHtml = render(PasswordResetEmail(payload));
        break;
      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data, error } = await supabaseClient.functions.invoke('send-email', {
      body: {
        to: payload.to,
        subject: subject,
        html: emailHtml,
      },
    });

    if (error) throw error;

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