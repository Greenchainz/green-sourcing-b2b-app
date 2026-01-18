import { NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

export async function POST(request: Request) {
  try {
    const { decision, alternatives, rationale, context } = await request.json();

    if (!decision) {
      return NextResponse.json(
        { error: 'Missing required field: decision' },
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

    console.log(`Analyzing defensibility for decision: ${JSON.stringify(decision)}`);

    const analysisPrompt = `Evaluate the defensibility of the following sourcing decision.
Decision: ${JSON.stringify(decision)}
Alternatives Considered: ${JSON.stringify(alternatives || [])}
Rationale Provided: ${rationale || 'None provided'}
Context: ${JSON.stringify(context || {})}

Analyze the decision based on:
1. Data sufficiency (is there enough proof?)
2. Comparative analysis (were alternatives fairly evaluated?)
3. Alignment with sustainability goals (if applicable)
4. Auditability (is the trail clear?)

Output the result as a JSON object with the following structure:
{
  "defensibility_score": number (1-10),
  "analysis_summary": "Executive summary of the analysis",
  "strengths": ["List of strong points"],
  "weaknesses": ["List of weak points or risks"],
  "missing_information": ["List of data points that would strengthen the decision"],
  "recommendations": ["Actionable steps to improve defensibility"]
}`;

    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        {
          role: 'system',
          content: 'You are a Defensibility Analyzer Agent. You evaluate sourcing decisions to ensure they are robust, data-backed, and audit-ready.',
        },
        { role: 'user', content: analysisPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
         return NextResponse.json(
        { error: 'Failed to analyze defensibility' },
        { status: 500 }
      );
    }

    const analysisResult = JSON.parse(content);

    return NextResponse.json({ analysis: analysisResult });
  } catch (error) {
    console.error('Error in defensibility analyzer agent:', error);
    return NextResponse.json(
      { error: 'Failed to analyze decision defensibility' },
      { status: 500 }
    );
  }
}
