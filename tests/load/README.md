# GreenChainz Load Tests (k6)

Three test levels targeting the critical user paths before launch.

## Install k6

```bash
# macOS
brew install k6

# Windows (via Chocolatey)
choco install k6

# Windows (via winget)
winget install k6

# Linux
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] \
  https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Seed test users

The k6 scripts log in with known test credentials. Create them first:

```bash
pnpm tsx tests/load/seed-test-users.ts
```

Default credentials (override via env):
| Role     | Email                                | Password       |
|----------|--------------------------------------|----------------|
| Buyer    | loadtest-buyer@greenchainz.com       | LoadTest123!   |
| Supplier | loadtest-supplier@greenchainz.com    | LoadTest123!   |

## Run the tests

### 1. Smoke — sanity check (< 2 min)

Run this before every full test to verify the server is up and all endpoints respond.

```bash
# Against local dev server (default)
k6 run tests/load/smoke.js

# Against staging
k6 run -e BASE_URL=https://staging.greenchainz.com tests/load/smoke.js

# With custom credentials
k6 run \
  -e BASE_URL=https://staging.greenchainz.com \
  -e BUYER_EMAIL=buyer@example.com \
  -e BUYER_PASSWORD=secret \
  tests/load/smoke.js
```

**Pass criteria:** All checks green, no 5xx, no 429.

---

### 2. Load — realistic production traffic (≈ 17 min)

Simulates the Founding 50 supplier launch (50 concurrent users):
- 22 VUs anonymous catalog browsing
- 15 VUs buyer flows (browse → create RFQ)
- 10 VUs supplier flows (check invites → bid)
- 3 VUs messaging/chat

```bash
k6 run tests/load/load.js

# Against staging
k6 run -e BASE_URL=https://staging.greenchainz.com tests/load/load.js
```

**Pass criteria (built-in thresholds):**
| Metric | Threshold |
|--------|-----------|
| Error rate | < 1% |
| Catalog p95 | < 400ms |
| Buyer/Supplier p95 | < 800ms |
| Mutations p95 | < 1000ms |
| Rate-limit hits | 0 |

---

### 3. Stress — find the breaking point (≈ 15 min)

Ramps to 200 concurrent VUs on catalog reads and 100 on RFQ writes. Expected to produce errors at peak — look for the VU count where error rate climbs and latency breaks 2s.

```bash
# ⚠️ Do NOT run against production without team sign-off
k6 run tests/load/stress.js

# Against staging (recommended)
k6 run -e BASE_URL=https://staging.greenchainz.com tests/load/stress.js
```

Review the k6 summary table for the inflection point. Look for:
- When does `http_req_duration{scenario:catalog_stress} p(95)` cross 2s?
- When does `http_req_failed` start climbing?
- Does it recover when load drops back to 50 VUs?

---

## What's being tested

| Scenario | Endpoints hit |
|----------|---------------|
| Catalog browse | `materialSwap.findAlternatives`, `materialSpec.searchBySpecs`, `epd.listForMaterial`, `ec3.searchByCarbon`, `assemblySpecs.list`, `location.distance` |
| Buyer flow | `auth.me`, `rfqRequests.list`, `rfqRequests.create`, `materialSpec.compareSpecs`, `location.nearbySuppliers`, `/api/messages/unread-count` |
| Supplier flow | `auth.me`, `rfqRequests.list`, `rfqRequests.getById`, `rfqRequests.submitQuote`, `epd.listMine`, `materialCreditScore.getForSupplier`, `/api/messages/threads` |
| Messaging | `/api/messages/unread-count` (poll), `/api/messages/threads`, `/api/messages/threads/:id`, `/api/messages/threads/:id/send`, `/api/messages/threads/:id/read` |

## Interpreting results

```
✓ checks.........................: 98.7% 4123 out of 4175
  http_req_blocked..............: avg=1.2ms   p(95)=2.1ms
  http_req_duration.............: avg=234ms   p(95)=612ms   p(99)=1.2s
  http_req_failed...............: 0.31%
  http_reqs.....................: 8432    8.23/s
```

Key numbers to record before launch:
1. **p95 catalog read** — target < 400ms at 50 VUs
2. **p95 RFQ create mutation** — target < 1000ms at 50 VUs
3. **Error rate** — must be < 1% at 50 VUs
4. **Requests/sec at 50 VUs** — baseline for Azure Container Apps scaling config

## Adding to CI (optional)

```yaml
# .github/workflows/load-test.yml
- name: Run smoke test
  run: |
    curl -L https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-linux-amd64.tar.gz | tar xz
    ./k6-v0.54.0-linux-amd64/k6 run \
      -e BASE_URL=${{ vars.STAGING_URL }} \
      -e BUYER_EMAIL=${{ secrets.LT_BUYER_EMAIL }} \
      -e BUYER_PASSWORD=${{ secrets.LT_BUYER_PASSWORD }} \
      tests/load/smoke.js
```
