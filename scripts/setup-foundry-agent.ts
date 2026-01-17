import { AIProjectClient } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';

async function setupSubmittalAgent() {
  const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;

  if (!endpoint) {
    throw new Error("Missing AZURE_AI_FOUNDRY_ENDPOINT environment variable");
  }

  console.log("Connecting to Foundry project...");
  const credential = new DefaultAzureCredential();
  const client = AIProjectClient.fromEndpoint(endpoint, credential);

  // Create agent (ONE TIME ONLY)
  console.log("Creating agent...");
  const agent = await client.agents.createAgent(
    process.env.MODEL_DEPLOYMENT_NAME || 'gpt-4o',
    {
        name: 'submittal-generator',
        instructions: `You are a submittal generation agent.
        Process PDFs using Document Intelligence,
        extract product specs with GPT-4o,
        match against PostgreSQL database,
        generate final submittal PDF.`,
        tools: [
        { type: 'code_interpreter' },
        { type: 'file_search' }
        ]
    }
  );

  console.log('✅ Created Foundry agent:');
  console.log(`   Agent ID: ${agent.id}`);
  console.log(`   Add to .env: AZURE_AI_FOUNDRY_DEPLOYMENT_NAME=${agent.id}`);

  return agent.id;
}

setupSubmittalAgent().catch(console.error);
