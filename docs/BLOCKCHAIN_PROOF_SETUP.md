# GreenChainz Proof Ledger — Setup Guide

## 1. Install dependencies

```bash
pnpm add viem
pnpm add @azure/keyvault-keys   # production Key Vault signing only
```

`viem` is required for all environments.  
`@azure/keyvault-keys` is only needed when `AZURE_KEY_VAULT_URL` is set (production).

---

## 2. Environment variables

### Local dev (`.env.local`)

```env
BLOCKCHAIN_PROOF_ENABLED=true
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<YOUR_KEY>
POLYGON_CHAIN_ID=80002
ANCHOR_REGISTRY_ADDRESS=0x...       # deployed contract address on Amoy
LOCAL_ANCHOR_PRIVATE_KEY=0x...      # dev/test wallet — never commit a real key
PROOF_EXPLORER_BASE_URL=https://amoy.polygonscan.com/tx/
```

### Production (Azure Container Apps secrets)

```env
BLOCKCHAIN_PROOF_ENABLED=true
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/<YOUR_KEY>
POLYGON_CHAIN_ID=137
ANCHOR_REGISTRY_ADDRESS=0x...       # deployed contract address on Polygon PoS
AZURE_KEY_VAULT_URL=https://<vault>.vault.azure.net/
AZURE_KEY_VAULT_KEY_NAME=greenchainz-anchor-key
PROOF_EXPLORER_BASE_URL=https://polygonscan.com/tx/
```

**Never set `LOCAL_ANCHOR_PRIVATE_KEY` in production.**  
The signing path will throw if it detects `NODE_ENV=production` with a local key.

---

## 3. Deploy the smart contract

```bash
# Install Foundry (one-time)
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Deploy to Amoy testnet
forge create contracts/AnchorRegistry.sol:AnchorRegistry \
  --rpc-url $POLYGON_RPC_URL \
  --private-key $LOCAL_ANCHOR_PRIVATE_KEY \
  --broadcast

# Copy the deployed address into ANCHOR_REGISTRY_ADDRESS
```

### After deployment: authorize the signing wallet

```bash
# Call setApprovedAnchor(signerAddress, true) from the owner wallet
cast send $ANCHOR_REGISTRY_ADDRESS \
  "setApprovedAnchor(address,bool)" \
  <SIGNER_WALLET_ADDRESS> true \
  --rpc-url $POLYGON_RPC_URL \
  --private-key $LOCAL_ANCHOR_PRIVATE_KEY
```

---

## 4. Run the database migration

```bash
pnpm run db:push
```

This creates the `blockchain_anchors` table from the schema added to `drizzle/schema.ts`.

---

## 5. Azure Key Vault setup (production)

1. Create an **EC key** with curve **P-256K** (secp256k1) in your Azure Key Vault
2. Name it `greenchainz-anchor-key` (or match `AZURE_KEY_VAULT_KEY_NAME`)
3. Grant the Container App's Managed Identity the **Key Sign** permission
4. The public key is read from Key Vault at startup to derive the Ethereum address
5. Call `setApprovedAnchor(<derived-address>, true)` on the deployed contract

---

## 6. File map

```
contracts/AnchorRegistry.sol                       ← Deploy this once to Polygon
drizzle/schema.ts                                  ← blockchainAnchors table (appended)
server/routers/blockchain-proof/
  proofTypes.ts        — shared types and artifact type IDs
  canonicalize.ts      — stable JSON serialization
  hashArtifact.ts      — keccak256 helpers (JSON + Buffer + string)
  anchorRegistryAbi.ts — typed ABI for the contract
  polygonClient.ts     — viem public client + explorerUrl()
  keyVaultEvmSigner.ts — signing abstraction (local key or Key Vault)
  anchorService.ts     — anchorArtifact() — submits tx + persists record
  verifyAnchor.ts      — verifyStoredAnchor() + getProofForArtifact()
  proofRouter.ts       — tRPC router: getProof, anchorEpd, anchorScore
client/src/components/proof/ProofBadge.tsx          ← Drop into any page
```

---

## 7. Integration checklist (per spec)

- [ ] EPD verified → call `anchorArtifact({ artifactType: "epd", ... })` in AI Audit Agent
- [ ] Material score computed → call `anchorArtifact({ artifactType: "material_score", ... })`
- [ ] Submittal approved → hash PDF bytes + call `anchorArtifact({ artifactType: "material_submittal", ... })`
- [ ] Add `<EpdProofBadge epdId={...} />` to supplier profile
- [ ] Add `<ScoreProofBadge materialId={...} />` to material detail page
- [ ] Add `<SubmittalProofBadge submittalId={...} />` to submittal detail page
