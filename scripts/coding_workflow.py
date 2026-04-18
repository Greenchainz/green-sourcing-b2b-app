#!/usr/bin/env python3
"""
GreenChainz Multi-Agent Workflow
==================================
Orchestrates all 17 GreenChainz Azure AI Foundry agents into a structured
pipeline covering three domains:

  CODING:   db-agent, frontend, coder2, auth, mobile, Scraper, qa-orchestrator-agent, docker-agent
  BUSINESS: workflow-agent (orchestrator), Chainz Commander, Market Intel, COMPLIANCE-VALIDATOR-AGENT
  MARKETING: marketing-agent, Growth Ops, OUTREACH-SCALER, RFQ-MATCHING, CARBON-OPTIMIZER-AGENT

Usage:
  python coding_workflow.py
  python coding_workflow.py --prompt "Add a supplier rating column to materials"
  python coding_workflow.py --mode business --prompt "Should we target healthcare GCs next quarter?"
  python coding_workflow.py --mode marketing --prompt "Write a cold email sequence for LEED APs"

Dependencies:
  pip install 'azure-ai-projects>=2.0.0b4' azure-identity rich

Authentication:
  az login   (uses your existing Azure CLI session)
"""

import os
import sys
import argparse
import json
from typing import Optional

try:
    from azure.identity import AzureCliCredential, DefaultAzureCredential
    from azure.ai.projects import AIProjectClient
    from azure.ai.projects.models import MessageRole
except ImportError:
    print("ERROR: Missing dependencies. Run:")
    print("  pip install 'azure-ai-projects>=2.0.0b4' azure-identity")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.panel import Panel
    RICH = True
    console = Console()
except ImportError:
    RICH = False
    console = None

# ── Configuration ──────────────────────────────────────────────────────────────

PROJECT_ENDPOINT = os.getenv(
    "AZURE_AI_PROJECT_ENDPOINT",
    "https://greenchainz-resource.services.ai.azure.com/api/projects/greenchainz"
)

# ── Full 17-Agent Roster ───────────────────────────────────────────────────────
# Key → exact Foundry agent name
AGENT_NAMES = {
    # Orchestrators
    "orchestrator":         "workflow-agent",
    "commander":            "Chainz Commander",      # master orchestrator / founder proxy

    # Coding specialists
    "db":                   "db-agent",
    "frontend":             "frontend",
    "backend":              "coder2",
    "backend_general":      "coder",
    "auth":                 "auth",
    "mobile":               "mobile",
    "scraper":              "Scraper",

    # QA & DevOps
    "qa":                   "qa-orchestrator-agent",
    "docker":               "docker-agent",

    # Business & intelligence
    "market_intel":         "Market Intel",
    "compliance":           "COMPLIANCE-VALIDATOR-AGENT",
    "carbon":               "CARBON-OPTIMIZER-AGENT",
    "rfq_matching":         "RFQ-MATCHING",

    # Marketing & growth
    "marketing":            "marketing-agent",
    "growth_ops":           "Growth Ops",
    "outreach_scaler":      "OUTREACH-SCALER",
}

# ── Routing Rules ──────────────────────────────────────────────────────────────
# Each rule: (keyword list, [agent keys to invoke in order])

CODING_ROUTES = [
    (["schema", "table", "migration", "drizzle", "column", "index", "foreign key", "postgres", "db", "database"],
     ["db"]),
    (["auth", "login", "oauth", "session", "jwt", "better-auth", "microsoft login", "google login"],
     ["auth", "backend"]),
    (["component", "page", "ui", "frontend", "react", "tailwind", "tsx", "css", "layout", "dashboard", "widget"],
     ["frontend"]),
    (["api", "router", "trpc", "endpoint", "server", "backend", "service", "handler", "procedure"],
     ["backend"]),
    (["mobile", "expo", "react native", "ios", "android", "app screen"],
     ["mobile"]),
    (["scraper", "scrape", "crawl", "ingest", "epd", "data pipeline", "parse"],
     ["scraper", "backend"]),
    (["docker", "container", "deploy", "containerapp", "yaml", "dockerfile", "environment variable"],
     ["docker"]),
]

BUSINESS_ROUTES = [
    (["competitor", "competitive", "market size", "market research", "legal", "regulation", "legislation", "sec", "ira"],
     ["market_intel"]),
    (["leed", "compliance", "certification", "breeam", "ibc", "buy clean", "well", "ashrae"],
     ["compliance"]),
    (["carbon", "gwp", "embodied carbon", "co2", "emissions", "lifecycle", "lca"],
     ["carbon"]),
    (["rfq", "bid", "match", "supplier match", "procurement", "spec"],
     ["rfq_matching"]),
    (["strategy", "priority", "roadmap", "decision", "should we", "what should", "next quarter", "q1", "q2"],
     ["commander", "market_intel"]),
]

MARKETING_ROUTES = [
    (["cold email", "outreach email", "email sequence", "nurture", "drip"],
     ["outreach_scaler", "growth_ops"]),
    (["linkedin", "ad copy", "landing page", "lead magnet", "campaign", "funnel"],
     ["growth_ops"]),
    (["marketing copy", "copy", "messaging", "positioning", "tagline", "headline"],
     ["marketing", "growth_ops"]),
    (["architect outreach", "supplier outreach", "cold call", "cold calling"],
     ["marketing", "outreach_scaler"]),
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def log(msg: str, style: str = ""):
    if RICH and console:
        console.print(msg, style=style)
    else:
        print(msg)

def header(title: str):
    if RICH and console:
        console.print(Panel(f"[bold]{title}[/bold]", expand=False))
    else:
        print(f"\n{'='*60}\n{title}\n{'='*60}")

def route_prompt(prompt: str, mode: str) -> list[str]:
    """Determine which specialist agents to invoke based on prompt keywords and mode."""
    lower = prompt.lower()
    routes = {"coding": CODING_ROUTES, "business": BUSINESS_ROUTES, "marketing": MARKETING_ROUTES}.get(mode, CODING_ROUTES)
    for keywords, agents in routes:
        if any(kw in lower for kw in keywords):
            return agents
    # Defaults per mode
    defaults = {
        "coding":    ["backend", "frontend"],
        "business":  ["commander", "market_intel"],
        "marketing": ["marketing", "growth_ops"],
    }
    return defaults.get(mode, ["backend"])

def get_all_agent_ids(client: AIProjectClient) -> dict[str, str]:
    """Fetch all agent IDs from Foundry and map them to our internal keys."""
    try:
        agents_list = client.agents.list_agents()
        name_to_id = {a.name: a.id for a in agents_list}
    except Exception as e:
        log(f"[red]Could not list agents: {e}[/red]")
        return {}

    agent_ids = {}
    for key, name in AGENT_NAMES.items():
        if name in name_to_id:
            agent_ids[key] = name_to_id[name]
            log(f"  [green]✓[/green] {name}")
        else:
            log(f"  [yellow]⚠[/yellow] {name} — not found in Foundry")
    return agent_ids

def run_agent(
    client: AIProjectClient,
    display_name: str,
    agent_id: str,
    prompt: str,
    context: str = "",
) -> str:
    """Run a single agent, stream its response, return the full text output."""
    header(f"▶ {display_name}")

    full_prompt = prompt
    if context:
        full_prompt = f"## Context from previous steps\n{context}\n\n## Your task\n{prompt}"

    try:
        thread = client.agents.create_thread()
        client.agents.create_message(
            thread_id=thread.id,
            role=MessageRole.USER,
            content=full_prompt,
        )

        output_text = ""
        with client.agents.create_stream(thread_id=thread.id, agent_id=agent_id) as stream:
            for event in stream:
                if hasattr(event, "delta") and hasattr(event.delta, "content"):
                    for block in event.delta.content:
                        if hasattr(block, "text") and block.text:
                            chunk = block.text.value or ""
                            output_text += chunk
                            print(chunk, end="", flush=True)

        print()
        client.agents.delete_thread(thread.id)
        return output_text

    except Exception as e:
        log(f"[red]Agent '{display_name}' failed: {e}[/red]")
        return f"ERROR: {e}"

# ── Workflow Modes ─────────────────────────────────────────────────────────────

def run_coding_workflow(client: AIProjectClient, agent_ids: dict, user_prompt: str):
    """
    Coding pipeline:
      orchestrator → plan → specialists → QA → docker (if needed)
    """
    header("CODING WORKFLOW")

    # Phase 1: Orchestrator plans
    orch_id = agent_ids.get("orchestrator")
    if not orch_id:
        log("[red]workflow-agent not found — cannot plan[/red]")
        return

    plan = run_agent(
        client, "workflow-agent (Planner)", orch_id,
        f"""A developer submitted this request: "{user_prompt}"

Break it into ordered sub-tasks. For each sub-task specify:
- Which file(s) to modify (exact paths)
- What to build (function, component, schema change, etc.)
- Dependencies on other sub-tasks

GreenChainz stack: TypeScript, Drizzle ORM, tRPC, React 18, Tailwind, better-auth, Azure Container Apps.
Output a numbered Markdown plan."""
    )

    context = f"## Orchestrator Plan\n{plan}"
    specialists = route_prompt(user_prompt, "coding")
    log(f"\n[bold]Specialists:[/bold] {', '.join(specialists)}\n")

    # Phase 2: Specialists execute
    for key in specialists:
        agent_id = agent_ids.get(key)
        if not agent_id:
            log(f"[yellow]Skipping {AGENT_NAMES.get(key, key)} — not in Foundry[/yellow]")
            continue
        output = run_agent(
            client, AGENT_NAMES[key], agent_id,
            f"""Original request: "{user_prompt}"

Your role: {agent_key_to_role(key)}

Produce complete, production-ready TypeScript code.
Standards: Drizzle ORM only (no Prisma, no raw SQL), tRPC for APIs, better-auth for auth, Tailwind for styles, no hardcoded secrets.
Use file path headers (e.g. ### server/routers/my-router.ts) before each code block.""",
            context=context,
        )
        context += f"\n\n## {AGENT_NAMES[key]} Output\n{output}"

    # Phase 3: QA
    qa_id = agent_ids.get("qa")
    if qa_id:
        qa_output = run_agent(
            client, "qa-orchestrator-agent (QA)", qa_id,
            f"""Review all code below for:
1. Security vulnerabilities (SQLi, XSS, IDOR, exposed secrets)
2. Architectural violations (Prisma, Stripe, wrong auth library, raw SQL)
3. TypeScript errors or missing types
4. Missing error handling
5. N+1 queries or missing DB indexes

For each issue: file path, problem, exact fix.
If clean: state "QA APPROVED — no issues found."

Code to review:
{context}""",
        )
        context += f"\n\n## QA Review\n{qa_output}"
    else:
        qa_output = "QA agent not available."

    # Phase 4: Docker (only if structural changes)
    docker_id = agent_ids.get("docker")
    needs_docker = any(kw in user_prompt.lower() for kw in [
        "deploy", "container", "docker", "env var", "environment variable",
        "new service", "new package", "install", "port"
    ])
    if docker_id and needs_docker:
        run_agent(
            client, "docker-agent (Deployment)", docker_id,
            f"""Based on the code changes below, does any Docker or Azure Container Apps config need updating?
Check: new npm packages, new env vars, new ports, build process changes.
If no changes needed: state "No deployment config changes required."

Changes:
{context}""",
        )

    _save_output(user_prompt, context)


def run_business_workflow(client: AIProjectClient, agent_ids: dict, user_prompt: str):
    """
    Business pipeline:
      commander → market_intel / compliance / carbon / rfq_matching
    """
    header("BUSINESS WORKFLOW")

    commander_id = agent_ids.get("commander")
    if commander_id:
        context = run_agent(
            client, "Chainz Commander (Business Orchestrator)", commander_id,
            f"""Jerit submitted this business question: "{user_prompt}"

Analyze it. Identify what data or analysis is needed. Break it into sub-questions for the relevant specialists:
- Market Intel: competitive landscape, market sizing, legal/regulatory
- Compliance Shield: LEED, BREEAM, IBC, Buy Clean
- Carbon Optimizer: GWP reduction, lifecycle cost, alternatives
- RFQ Matching: supplier matching, procurement strategy

Output a structured analysis plan in BLUF format."""
        )
    else:
        context = f"Business question: {user_prompt}"

    specialists = route_prompt(user_prompt, "business")
    log(f"\n[bold]Specialists:[/bold] {', '.join(specialists)}\n")

    for key in specialists:
        agent_id = agent_ids.get(key)
        if not agent_id:
            log(f"[yellow]Skipping {AGENT_NAMES.get(key, key)} — not in Foundry[/yellow]")
            continue
        output = run_agent(
            client, AGENT_NAMES[key], agent_id,
            f"""Business question: "{user_prompt}"

Provide your specialist analysis. Support every conclusion with evidence.
BLUF format: conclusion first, then supporting detail.
Flag weak assumptions clearly.""",
            context=context,
        )
        context += f"\n\n## {AGENT_NAMES[key]} Analysis\n{output}"

    _save_output(user_prompt, context)


def run_marketing_workflow(client: AIProjectClient, agent_ids: dict, user_prompt: str):
    """
    Marketing pipeline:
      marketing-agent → growth_ops → outreach_scaler
    Persona-aware: integrates the 7-layer procurement persona system.
    """
    header("MARKETING WORKFLOW")

    # Inject persona context into every marketing prompt
    persona_context = """## GreenChainz 7-Layer Procurement Persona System
All copy must lead with the financial/operational driver for the target persona — never lead with green messaging.

Layer 1 — Design Authorities (Architects, Interior Designers): Driver = liability protection + spec efficiency
Layer 2 — Financial Gatekeepers (Developers, CFOs): Driver = stranded asset risk + ESG valuation premium
Layer 3 — Compliance Navigators (LEED APs, Sustainability Consultants): Driver = the point system + audit defensibility
Layer 4 — Project Orchestrators (GCs, CMs): Driver = pre-con speed + bid competitiveness
Layer 5 — Procurement Specialists: Driver = supply chain risk + cost predictability
Layer 6 — Technical Validators (Engineers): Driver = performance compliance + liability
Layer 7 — Institutional Buyers (Gov, Healthcare, Education): Driver = Buy Clean mandates + public procurement rules

Tone: Direct, professional, benefit-led. No jargon. No preachy green messaging."""

    specialists = route_prompt(user_prompt, "marketing")
    log(f"\n[bold]Specialists:[/bold] {', '.join(specialists)}\n")

    context = persona_context

    for key in specialists:
        agent_id = agent_ids.get(key)
        if not agent_id:
            log(f"[yellow]Skipping {AGENT_NAMES.get(key, key)} — not in Foundry[/yellow]")
            continue
        output = run_agent(
            client, AGENT_NAMES[key], agent_id,
            f"""Marketing request: "{user_prompt}"

Apply the 7-layer persona system. Identify the target persona(s) and lead with their financial/operational driver.
Produce copy that is direct-response style: benefit-led, specific, no jargon, no green preaching.
Output clean Markdown ready to paste.""",
            context=context,
        )
        context += f"\n\n## {AGENT_NAMES[key]} Output\n{output}"

    _save_output(user_prompt, context)


# ── Utilities ──────────────────────────────────────────────────────────────────

def agent_key_to_role(key: str) -> str:
    roles = {
        "db":               "Database specialist. Write Drizzle schema changes and migration scripts only.",
        "frontend":         "Frontend specialist. Write React components, pages, and Tailwind styles.",
        "backend":          "Backend specialist. Write tRPC router procedures and server-side business logic.",
        "backend_general":  "General backend specialist. Write utility functions and server-side helpers.",
        "auth":             "Auth specialist. Handle better-auth configuration, session logic, and OAuth providers.",
        "mobile":           "Mobile specialist. Write Expo/React Native screens and navigation (READ ONLY — do not modify web app).",
        "scraper":          "Scraper specialist. Write data ingestion, parsing, and ETL pipeline logic.",
        "compliance":       "Compliance specialist. Validate LEED, BREEAM, IBC, and Buy Clean standards.",
        "carbon":           "Carbon specialist. Suggest lower-carbon alternatives with GWP delta calculations.",
        "rfq_matching":     "RFQ matching specialist. Rank suppliers by distance, CCPS score, and price.",
        "market_intel":     "Market intelligence specialist. Provide competitive analysis and regulatory research.",
        "marketing":        "Marketing specialist. Write persona-targeted copy and campaign strategy.",
        "growth_ops":       "Growth operations specialist. Execute the 8-bucket funnel strategy.",
        "outreach_scaler":  "Outreach specialist. Write cold email sequences and supplier/architect outreach.",
        "commander":        "Master orchestrator. Analyze, plan, and coordinate across all domains.",
    }
    return roles.get(key, "Specialist. Produce clean, production-ready output.")

def _save_output(prompt: str, content: str):
    output_path = "/tmp/greenchainz_workflow_output.md"
    with open(output_path, "w") as f:
        f.write(f"# GreenChainz Workflow Output\n\n**Prompt:** {prompt}\n\n")
        f.write(content)
    log(f"\n[bold green]Full output saved to:[/bold green] {output_path}")

# ── Entry Point ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="GreenChainz Multi-Agent Workflow")
    parser.add_argument("--prompt", type=str, help="The task to execute")
    parser.add_argument(
        "--mode",
        choices=["coding", "business", "marketing", "auto"],
        default="auto",
        help="Workflow mode (default: auto-detect from prompt)"
    )
    args = parser.parse_args()

    if args.prompt:
        user_prompt = args.prompt
    else:
        header("GreenChainz Multi-Agent Workflow")
        log("Modes: [bold]coding[/bold] | [bold]business[/bold] | [bold]marketing[/bold] | [bold]auto[/bold]")
        user_prompt = input("\nEnter your request:\n> ").strip()
        if not user_prompt:
            print("No prompt provided. Exiting.")
            sys.exit(0)

    # Auto-detect mode from prompt keywords
    mode = args.mode
    if mode == "auto":
        lower = user_prompt.lower()
        if any(kw in lower for kw in ["email", "copy", "campaign", "outreach", "linkedin", "funnel", "cold call", "marketing"]):
            mode = "marketing"
        elif any(kw in lower for kw in ["strategy", "competitor", "market", "legal", "should we", "carbon", "rfq match", "compliance"]):
            mode = "business"
        else:
            mode = "coding"
        log(f"[dim]Auto-detected mode: {mode}[/dim]\n")

    # Connect
    log("[dim]Connecting to Azure AI Foundry...[/dim]")
    try:
        credential = AzureCliCredential()
        client = AIProjectClient(endpoint=PROJECT_ENDPOINT, credential=credential)
        log("[green]Connected.[/green]\n")
    except Exception as e:
        log(f"[red]ERROR: {e}[/red]\nRun: az login")
        sys.exit(1)

    # Resolve agents
    log("[dim]Resolving agents...[/dim]")
    agent_ids = get_all_agent_ids(client)
    print()

    # Run the right workflow
    if mode == "coding":
        run_coding_workflow(client, agent_ids, user_prompt)
    elif mode == "business":
        run_business_workflow(client, agent_ids, user_prompt)
    elif mode == "marketing":
        run_marketing_workflow(client, agent_ids, user_prompt)

if __name__ == "__main__":
    main()
