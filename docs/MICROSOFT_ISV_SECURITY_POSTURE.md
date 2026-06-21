# Microsoft ISV Submission — Security Posture Answers

This document contains the canonical answers for the Microsoft Partner Center / ISV Success
security review questionnaire. Copy these responses verbatim into the submission form.

> **Note**: The Azure Marketplace listing type is "Software as a Service" (subscription billing
> model). The *hosting infrastructure* classification below is separate and refers to how the
> application is deployed — Azure Container Apps is PaaS, not IaaS.

---

## 1. Hosting Classification

**Field**: "How is your application hosted?"

**Answer**:

```
PaaS / Serverless
```

**Rationale**: GreenChainz runs on Azure Container Apps, which is a fully managed
Platform-as-a-Service (PaaS). There are no virtual machines, no OS-level access, and no
IaaS responsibilities for the application team. Azure manages host patching, runtime, and
infrastructure security at the platform layer.

---

## 2. Malware Protection

**Field**: "Describe your malware and threat protection approach"

**Answer**:

> The GreenChainz platform uses a layered malware and threat protection approach aligned with
> Azure-native security services:
>
> **Microsoft Defender for Cloud (Containers)**
> - Continuous security posture assessment and threat detection across container workloads and
>   supporting Azure resources
> - Runtime threat detection for Azure Container Apps workloads
>
> **Container Image Security**
> - All images are stored in Azure Container Registry (private, not public)
> - Images are scanned for vulnerabilities before deployment
> - Only trusted images are deployed via CI/CD (GitHub Actions); no ad-hoc image pushes to
>   production
>
> **Platform-Level Protection**
> - Azure manages host OS security, patching, and anti-malware at the infrastructure layer
> - No direct VM or OS access is exposed to application operators
>
> **Application-Level Controls**
> - Strict input validation enforced via Zod schemas on all API inputs
> - Protected API surface via a typed tRPC layer — no raw REST endpoints exposed
> - No execution of user-provided code or arbitrary binaries; the application does not support
>   arbitrary code execution, file uploads with execution risk, or user-supplied binaries,
>   reducing exposure to malware injection vectors
>
> **Secrets & Credential Protection**
> - All credentials and API keys are stored in Azure Key Vault
> - Access is granted via Managed Identity (no embedded secrets in code or environment files)
>
> This layered approach ensures protection across infrastructure, container runtime, and
> application layers.

---

## 3. Defender Scope Statement

Add this sentence wherever the submission form asks for Defender coverage details:

> Microsoft Defender for Cloud is enabled to provide continuous security posture assessment
> and threat detection across container workloads and supporting Azure resources.

---

## 4. Identity & Authentication

**Field**: "Describe your authentication model"

**Answer**:

> GreenChainz uses Azure Entra ID (formerly Azure AD) for all user authentication via OAuth 2.0
> PKCE flow. Sessions are issued as HttpOnly JWT cookies and verified server-side on every
> request. There is no client-side credential storage. Role-based access control (RBAC) enforces
> `admin > architect > supplier > public` tier separation. All tRPC API procedures are protected
> by a `protectedProcedure` guard that validates the session before executing any query.

---

## 5. Data Encryption

**Field**: "How is data encrypted at rest and in transit?"

**Answer**:

> - **In transit**: All communication is over TLS 1.2+ enforced by Azure Container Apps ingress.
>   Internal service-to-service calls remain within the Azure private network.
> - **At rest**: PostgreSQL data is encrypted at rest by Azure Database for PostgreSQL (AES-256,
>   managed by Azure). Azure Blob Storage uses Azure-managed encryption keys by default.
>   Azure Key Vault secrets are encrypted with HSM-backed keys.

---

## 6. Summary Alignment Table

| Area | Status |
|---|---|
| Architecture | ✅ Azure Container Apps = PaaS |
| Hosting Classification | ✅ PaaS / Serverless (not IaaS, not SaaS infrastructure) |
| Malware Protection | ✅ Microsoft Defender for Cloud (Containers) |
| Container Security | ✅ Private ACR + CI/CD-gated image deployment |
| Identity | ✅ Azure Entra ID + Easy Auth sidecar (production) |
| Secrets | ✅ Azure Key Vault + Managed Identity |
| Encryption | ✅ TLS in transit, AES-256 at rest |
| No Arbitrary Code Execution | ✅ Confirmed — no user-supplied binaries |
