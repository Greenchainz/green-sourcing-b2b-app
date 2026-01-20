import { NextResponse } from 'next/server';
import { chat } from '@/lib/azure/openai';

export async function POST(request: Request) {
  try {
    const { recipientType, purpose, context } = await request.json();

    if (!recipientType || !purpose || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientType, purpose, context' },
        { status: 400 }
      );
    }

    console.log(`Generating email for recipient type: ${recipientType}`);

    const emailPrompt = `Write a professional B2B email for GreenChainz:
Recipient: ${recipientType}
Purpose: ${purpose}
Context: ${context}`;

    const response = await chat(
      [{ role: 'user', content: emailPrompt }],
      {
        systemMessage: 'You are an expert B2B email copywriter for GreenChainz, a sustainable construction marketplace. Write professional, concise, and persuasive emails.',
        temperature: 0.7,
      }
    );

    const emailBody = response.content || 'Unable to generate email.';

    return NextResponse.json({ email: emailBody });
  } catch (error) {
    console.error('Error generating email:', error);
    // Determine if it's a configuration error based on the error message from helper
    if (error instanceof Error && error.message.includes('Missing AZURE_OPENAI')) {
        return NextResponse.json(
            { error: 'Server configuration error: Azure OpenAI credentials missing' },
            { status: 500 }
        );
    }
    return NextResponse.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    );
  }
}
