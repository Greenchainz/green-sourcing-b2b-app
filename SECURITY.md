# Security Policy

GreenChainz takes security seriously for all GreenChainz codebases, including this `green-sourcing-b2b-app` service. If you believe you’ve found a security vulnerability, please follow the process below so we can address it quickly and responsibly.

---

## Supported Versions

We only provide security fixes for actively maintained branches.

| Version     | Status              |
|------------|---------------------|
| 1.x        | ✅ Supported        |
| 0.x        | ⚠️ Best‑effort only |

If you are using an unsupported version, you may be asked to upgrade to the latest release before we can provide a fix.

---

## Reporting a Vulnerability

Please report security issues **privately**. Do not open a public GitHub issue or discuss details in public channels.[web:38]

Use one of the following:

- Email: `security@greenchainz.com`  
- GitHub: Use the **“Report a vulnerability”** feature under the repository **Security** tab when available.[web:44]

When you contact us, include (as applicable):

- A clear description of the issue and where you found it (repo, file, endpoint, API, etc.).
- Steps to reproduce, including any sample requests, test accounts, or configuration details.
- The potential impact (data exposure, privilege escalation, denial of service, etc.).
- Any known workarounds or mitigations.

We prefer reports in English and plain text or Markdown.

---

## Our Disclosure Process

When we receive a vulnerability report, we will:

1. Acknowledge receipt of your report, typically within **3 business days**.
2. Triage and validate the issue, including severity and impact.
3. Develop, test, and prepare a fix and/or mitigation.
4. Coordinate release of the fix and, when appropriate, publish a short security notice or advisory.[web:38][web:41]
5. Credit the reporter if desired and permitted.

We aim to remediate **critical and high‑severity** issues as quickly as reasonably possible. For less severe issues, the fix may be bundled into a regular release.

---

## Scope

This policy covers:

- GreenChainz open‑source repositories under the `Greenchainz` GitHub organization.
- Backend services, APIs, and agents directly used by the GreenChainz marketplace and audit tools.
- Infrastructure‑as‑code and configuration files in these repositories.

Out‑of‑scope examples:

- Social engineering against GreenChainz staff or partners.
- Physical security attacks.
- Denial‑of‑service tests against production systems without prior written approval.

If you’re unsure whether something is in scope, contact us privately and ask.

---

## Safe Harbor

We support **good‑faith security research**:

- As long as you make a best effort to avoid privacy violations, data destruction, or service disruption.
- As long as you do **not** access, modify, or exfiltrate data that does not belong to you.
- As long as you give us a reasonable chance to fix the issue before public disclosure.

If these conditions are met, GreenChainz will not initiate legal action against you for your research activities related to this policy.

---

## Security Best Practices for Contributors

When contributing to this project:

- Do not commit secrets (API keys, passwords, connection strings, certificates).
- Use environment variables or secret stores (for example, Azure Key Vault) for sensitive configuration.
- Keep dependencies up to date and avoid introducing libraries with known high‑severity vulnerabilities.[web:41][web:47]
- Follow the project’s code review and CI checks, including security scans where configured.

If you are unsure whether a change introduces a security risk, ask in the pull request and flag it for security review.

---

## Contact

For all security‑related questions
