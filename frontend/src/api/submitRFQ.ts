// frontend/src/api/submitRFQ.ts

import { supabase } from '../../lib/supabase';
import type { RFQ } from '../types';

/**
 * @function submitRFQ
 * @description Submits an RFQ to the database and triggers a notification.
 * @param {RFQ} rfqData - The RFQ data to submit.
 * @returns {Promise<{success: boolean, error?: string}>} - The result of the operation.
 */
export async function submitRFQ(rfqData: RFQ): Promise<{success: boolean, error?: string}> {
  try {
    // Step 1: Validate the incoming RFQ data to ensure it's not empty.
    if (!rfqData || !rfqData.buyer_id || !rfqData.product_id || !rfqData.project_name || rfqData.quantity <= 0) {
      return { success: false, error: 'Invalid RFQ data provided.' };
    }

    // Step 2: Insert the RFQ data into the 'rfqs' table in Supabase.
    const { error: insertError } = await supabase
      .from('rfqs')
      .insert([rfqData]);

    if (insertError) {
      // If the database insertion fails, return an error.
      console.error('Error inserting RFQ into database:', insertError);
      return { success: false, error: insertError.message };
    }

    // Step 3: If insertion is successful, invoke a Supabase Edge Function to send an email.
    // We'll assume the Edge Function is named 'send-rfq-email'.
    const { error: functionError } = await supabase.functions.invoke('send-rfq-email', {
      body: rfqData,
    });

    if (functionError) {
      // If the Edge Function fails, log the error but consider the submission a partial success
      // since the data is in our system. We can have a fallback for failed notifications.
      console.error('Error invoking send-rfq-email Edge Function:', functionError);
      // Depending on business rules, you might want to return success: true here and handle the notification failure separately.
      return { success: false, error: `RFQ submitted, but notification failed: ${functionError.message}` };
    }

    // Step 4: If both steps succeed, return a success state.
    return { success: true };

  } catch (error) {
    // Catch any unexpected errors during the process.
    console.error('An unexpected error occurred in submitRFQ:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
}
