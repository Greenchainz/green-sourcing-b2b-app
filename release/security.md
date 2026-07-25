# Security & Trust Documentation

## Overview

GreenChainz is designed with security as a foundational requirement. This document outlines our security posture for the Autodesk marketplace review.

---

## Authentication & Authorization

| Control | Implementation |
|---------|---------------|
| Authentication | OAuth 2.0 with secure token exchange |
| Session management | Short-lived JWTs, refresh token rotation |
| Role-based access | Users see only their authorized data |
| MFA | Supported for production accounts |

## Credential Handling

- ✅ **No Autodesk credentials stored** — GreenChainz never receives or stores Autodesk login information
- ✅ **No hardcoded secrets** — All credentials are environment variables, never in source code
- ✅ **No client-side secrets** — API keys and service credentials exist only server-side
- ✅ **Token-based auth** — Tokens passed via Authorization header, never in query parameters

## Data Protection

| Measure | Detail |
|---------|--------|
| Encryption in transit | TLS 1.2+ enforced on all endpoints |
| Encryption at rest | Azure-managed encryption for database and storage |
| Data isolation | Multi-tenant with strict row-level security |
| PII handling | Minimal collection, no sharing with third parties |

## Infrastructure Security

- **Hosting:** Azure Container Apps (managed, auto-patched)
- **Database:** Azure PostgreSQL with private networking
- **Network:** No public database endpoints; API-only access
- **Monitoring:** Azure Monitor + Sentry for error tracking
- **Compliance alignment:** SOC 2 practices (formal cert in progress)

## What We Do NOT Do

- ❌ Store Autodesk credentials or tokens
- ❌ Access Autodesk project files or models
- ❌ Transmit PII to third parties
- ❌ Use HTTP (unencrypted) for any endpoint
- ❌ Store secrets in source code or client bundles
- ❌ Expose database directly to internet

## Incident Response

- Security issues: security@greenchainz.com
- Response SLA: Critical issues acknowledged within 4 hours
- Vulnerability disclosure: Responsible disclosure accepted

## Contact

For security questions related to this marketplace submission:
- Email: security@greenchainz.com
- Founder: Jerit Norville (jerit@greenchainz.com)
