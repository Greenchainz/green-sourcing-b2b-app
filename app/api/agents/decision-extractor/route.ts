import { NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

export async function POST(request: Request) {
  try {
    const { text, documentType } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
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

    const client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion: '2024-08-01-preview',
      deployment,
    });

    console.log(`Extracting logic from document type: ${documentType || 'unknown'}`);

    const extractionPrompt = `Analyze the following text and extract the decision-making logic, criteria, and rules.
Document Type: ${documentType || 'General'}
Text:
${text}

Output the result as a JSON object with the following structure:
{
  "criteria": [
    {
      "name": "Criterion Name",
      "description": "Description of the criterion",
      "importance": "High/Medium/Low",
      "conditions": "Specific conditions or thresholds (e.g., < 5 kg CO2e)"
    }
  ],
  "rules": [
    "List of explicit rules found in the text"
  ],
  "decision_process": "Summary of the decision-making process described"
}`;

    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        {
          role: 'system',
          content: 'You are a Decision Logic Extractor. You identify and structure decision criteria from unstructured text.',
        },
        { role: 'user', content: extractionPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
         return NextResponse.json(
        { error: 'Failed to extract logic' },
        { status: 500 }
      );
    }

    const extractionResult = JSON.parse(content);

    return NextResponse.json({ extraction: extractionResult });
  } catch (error) {
    console.error('Error in decision extractor agent:', error);
    return NextResponse.json(
      { error: 'Failed to extract decision logic' },
      { status: 500 }
    );
  }
}
