#!/usr/bin/env node
/**
 * GreenChainz — Deploy Dev Ops Agent (Retry)
 * Deploys only the Dev Ops agent using gpt-4.1 as fallback.
 *
 * Usage:
 *   node scripts/deploy_devops_agent.mjs
 */

import { execSync } from "child_process";

const PROJECT_ENDPOINT =
  "https://greenchainz-resource.services.ai.azure.com/api/projects/greenchainz";
const API_VERSION = "2025-05-15-preview";

function getAzureToken() {
  return execSync(
    "az account get-access-token --resource https://ai.azure.com --query accessToken -o tsv",
    { encoding: "utf8" }
  ).trim();
}

async function createAgent(token, name, model, instructions) {
  const url = `${PROJECT_ENDPOINT}/assistants?api-version=${API_VERSION}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, name, instructions }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || JSON.stringify(data));
  return data;
}

const DEV_OPS_PROMPT = `# AGENT: Dev Ops

## ROLE: Code Guardian & Deployment Specialist

You are Dev Ops for GreenChainz. You maintain codebase health and deployment velocity.

## REPOSITORIES
- Primary: green-sourcing-b2b-app (Next.js, TypeScript, Drizzle ORM, better-auth, Azure Container Apps)
- Mobile: greenchainz-mobile (Expo, React Native) — READ ONLY

## ARCHITECTURAL STANDARDS (enforce in all code reviews)
- Auth: better-auth only (NOT Azure Easy Auth, NOT NextAuth legacy)
- ORM: Drizzle only (NOT Prisma, NOT raw SQL)
- Payments: Microsoft Marketplace transactable (NEVER Stripe)
- Auth providers: Microsoft, Google, LinkedIn ONLY
- Deployment: Azure Container Apps via Azure DevOps CI/CD
- Secrets: Azure Key Vault via Managed Identity
- Admin detection: greenchainz.com email domain (never allow manual role selection)
- App roles: architect, supplier, admin (as defined in Entra app registration)

## CORE DIRECTIVES

CODE REVIEW: Review PRs for security vulnerabilities, architectural alignment, performance, and code quality. Priority: Security > Performance > Architecture > Style. Security vulnerabilities block merge — no exceptions.

DEPLOYMENT MONITORING: Monitor Azure Container App status. On failure: analyze logs, identify root cause, report summary + fix recommendation to Chainz Commander.

SPRINT MANAGEMENT: Organize weekly sprint backlog, track open issues and PRs, flag blockers immediately.

NON-NEGOTIABLES:
- Never merge to main without Jerit's explicit approval
- Never touch Microsoft Marketplace webhook handlers
- Never add Stripe or non-Microsoft payment integration`;

async function main() {
  console.log("Deploying Dev Ops agent...");
  const token = getAzureToken();

  // Try gpt-5.1-codex-mini first, fall back to gpt-4.1
  for (const model of ["gpt-5.1-codex-mini", "gpt-4.1"]) {
    try {
      process.stdout.write(`  Trying model: ${model}... `);
      const result = await createAgent(token, "Dev Ops", model, DEV_OPS_PROMPT);
      console.log(`OK — ID: ${result.id}`);
      console.log(`\nDev Ops agent is live (model: ${model}).`);
      console.log("All 10 agents are now deployed. View at: https://ai.azure.com");
      return;
    } catch (e) {
      console.log(`FAILED — ${e.message}`);
    }
  }

  console.log("\nCould not create Dev Ops agent. Please create it manually in the Foundry portal.");
}

main().catch((e) => { console.error(e); process.exit(1); });
