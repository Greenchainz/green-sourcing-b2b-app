import { NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

export async function POST(request: Request) {
  try {
    const { recipientType, purpose, context } = await request.json();

    if (!recipientType || !purpose || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientType, purpose, context' },
        { status: 400 }
      );
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

    if (!endpoint || !apiKey) {
      console.error('Missing Azure OpenAI credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Azure OpenAI credentials missing' },
        { status: 500 }
      );
    }

    // Connect to Azure OpenAI to generate email body
    const client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion: '2024-08-01-preview',
      deployment,
    });

    console.log(`Generating email for recipient type: ${recipientType}`);

    const emailPrompt = `Write a professional B2B email for GreenChainz:
Recipient: ${recipientType}
Purpose: ${purpose}
Context: ${context}`;

    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        {
          role: 'system',
          content: 'You are an expert B2B email copywriter for GreenChainz, a sustainable construction marketplace. Write professional, concise, and persuasive emails.',
        },
        { role: 'user', content: emailPrompt },
      ],
      temperature: 0.7,
    });

    const emailBody = response.choices[0]?.message?.content || 'Unable to generate email.';

    return NextResponse.json({ email: emailBody });
  } catch (error) {
    console.error('Error generating email:', error);
    return NextResponse.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    );
  }
}
