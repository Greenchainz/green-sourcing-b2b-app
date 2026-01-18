import { NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

export async function POST(request: Request) {
  try {
    const { task, context } = await request.json();

    if (!task) {
      return NextResponse.json(
        { error: 'Missing required field: task' },
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

    console.log(`Orchestrating task: ${task}`);

    const orchestratorPrompt = `Analyze the following task for GreenChainz (a sustainable construction marketplace) and determine the best course of action.
Task: ${task}
Context: ${JSON.stringify(context || {})}

Available Agents/Capabilities:
1. Email Writer: Generates professional B2B emails.
2. Decision Logic Extractor: Extracts criteria and rules from documents/text.
3. Defensibility Analyzer: Evaluates the defensibility of a sourcing decision.

Output your response as a JSON object with the following structure:
{
  "intent": "email" | "extract_logic" | "analyze_defensibility" | "general_query",
  "reasoning": "Explanation of why this intent was chosen",
  "recommended_action": "Description of what should be done",
  "subtasks": ["List of subtasks if the task is complex"]
}`;

    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent Orchestration Agent for GreenChainz. You categorize user requests and plan workflows.',
        },
        { role: 'user', content: orchestratorPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
         return NextResponse.json(
        { error: 'Failed to generate orchestration plan' },
        { status: 500 }
      );
    }

    const plan = JSON.parse(content);

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error in orchestrator agent:', error);
    return NextResponse.json(
      { error: 'Failed to process task' },
      { status: 500 }
    );
  }
}
