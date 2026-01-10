---
name: azure-build-enforcer
description: Enforces Azure Container Apps build requirements (Node >=18.18.0) and flags config drift.
---

# Azure Build Enforcer

- Validate Node.js version (>=18.18.0) across Oryx, workflows, and Dockerfiles.
- Ensure package.json engines specify Node >=18.18.0 and npm >=8.0.0.
- Flag dependencies that require newer Node (Azure SDKs, react-email, Playwright).
- Highlight mismatches between configured versions and Azure Container Apps environment.
