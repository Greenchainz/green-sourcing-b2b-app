# Azure AI Foundry private access unblock checklist

## Goal
Restore access to the GreenChainz Azure AI Foundry project currently showing **"Private network access required"** and keep work open until end-to-end access is confirmed.

## Definition of done (hard gates)
- [ ] Foundry home opens without the private network access error from an approved network path.
- [ ] DNS for the Foundry private endpoint resolves to a private IP from the client path being used.
- [ ] Network path is validated (VPN/ExpressRoute/peered VNet + NSG/UDR rules allow required traffic).
- [ ] Browser session is confirmed against the correct tenant/subscription/project context.
- [ ] A rollback-safe record exists of every change made (who/what/when).

## Phase 1 - Triage and scope lock
- [ ] Confirm exact Foundry resource/project name and subscription.
- [ ] Confirm intended access path (corp device, VPN, jump host, Azure VM in VNet).
- [ ] Capture current failure evidence (timestamp + screenshot + URL).
- [ ] Confirm whether issue affects one user or all users.

## Phase 2 - Private endpoint and network checks
- [ ] Verify Foundry public network access is intentionally disabled.
- [ ] Verify private endpoint connection status is `Approved`.
- [ ] Verify private DNS zone is linked to the client VNet.
- [ ] Verify required DNS A records exist and are current.
- [ ] Verify NSG and route table do not block endpoint traffic.
- [ ] Verify firewall/proxy policy permits required HTTPS egress.

## Phase 3 - Identity and context checks
- [ ] Validate user has required RBAC on resource group/project.
- [ ] Validate correct tenant is active in browser and Azure session.
- [ ] Validate no conditional access policy is silently blocking this path.

## Phase 4 - Fix and verify
- [ ] Apply smallest safe change to restore access (DNS link, VNet link, routing, or access path).
- [ ] Re-test Foundry access from approved network.
- [ ] Re-test from one alternate approved endpoint.
- [ ] Log final root cause and exact remediation steps.

## Phase 5 - Keep it from recurring
- [ ] Add runbook step for onboarding new machines to approved network path.
- [ ] Add a recurring access check (manual or scripted) to catch drift.
- [ ] Track this incident until 48h stable access with no recurrence.

## Parallel execution map (maximize concurrency)

### Track A - Scope and evidence
- [ ] Confirm project/resource IDs, affected users, and failure evidence.

### Track B - Network path
- [ ] Validate VPN/ExpressRoute/peering path, NSG, UDR, proxy/firewall.

### Track C - DNS
- [ ] Validate private DNS zone links and private endpoint record resolution.

### Track D - Endpoint resource state
- [ ] Validate private endpoint approval and intended public access setting.

### Track E - Identity and policy
- [ ] Validate RBAC + tenant context + conditional access effects.

### Dependency gates
- [ ] **Gate 1:** Tracks B/C/D/E complete before any remediation change.
- [ ] **Gate 2:** Remediation complete before end-to-end verification.
- [ ] **Gate 3:** Verification complete before runbook hardening and closure.
