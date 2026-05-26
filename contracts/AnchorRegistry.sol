// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * GreenChainz Proof Ledger — AnchorRegistry
 *
 * Stores cryptographic proof that a GreenChainz artifact (EPD, certification,
 * material credit score snapshot, or approved submittal) existed in a specific
 * verified state at a specific time.
 *
 * Security model:
 *   - Only GreenChainz server wallets may call anchor()
 *   - No raw business metadata is stored on-chain
 *   - Only keccak256 hashes are stored (via events)
 *   - Owner can rotate approved anchor wallets without redeploying
 *
 * Deploy once to Polygon PoS (chainId 137) or Amoy testnet (chainId 80002).
 */
contract AnchorRegistry {
    address public owner;

    // Approved server wallets that may call anchor()
    mapping(address => bool) public approvedAnchors;

    // ─── Events ───────────────────────────────────────────────────────────────

    /**
     * Emitted for every anchored artifact.
     *
     * @param artifactHash  keccak256 of the artifact content (PDF bytes, canonical JSON, etc.)
     * @param contextHash   keccak256 of the canonical metadata package
     * @param artifactType  1=EPD  2=CERTIFICATION  3=MATERIAL_SCORE  4=MATERIAL_SUBMITTAL  5=SUPPLIER_AUDIT
     * @param anchoredBy    The approved wallet address that submitted this anchor
     * @param timestamp     block.timestamp at the time of anchoring
     */
    event AnchorCreated(
        bytes32 indexed artifactHash,
        bytes32 indexed contextHash,
        uint8   indexed artifactType,
        address         anchoredBy,
        uint256         timestamp
    );

    event AnchorPermissionUpdated(
        address indexed anchor,
        bool            approved
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "AnchorRegistry: not owner");
        _;
    }

    modifier onlyApprovedAnchor() {
        require(
            msg.sender == owner || approvedAnchors[msg.sender],
            "AnchorRegistry: not approved anchor"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ─── Owner functions ──────────────────────────────────────────────────────

    /**
     * Grant or revoke anchor permissions for a server wallet.
     * Call this after deployment to authorize the GreenChainz signing wallet.
     */
    function setApprovedAnchor(address anchor, bool approved) external onlyOwner {
        require(anchor != address(0), "AnchorRegistry: zero address");
        approvedAnchors[anchor] = approved;
        emit AnchorPermissionUpdated(anchor, approved);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AnchorRegistry: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── Anchor ───────────────────────────────────────────────────────────────

    /**
     * Anchor a verified artifact proof on-chain.
     *
     * Called by the GreenChainz server after verifying an EPD, certification,
     * score snapshot, or submittal. The proof is permanent and immutable once
     * the transaction is confirmed.
     *
     * @param artifactHash  keccak256(artifact content) — PDF bytes or canonical JSON
     * @param contextHash   keccak256(canonical metadata) — type, supplierId, materialId, etc.
     * @param artifactType  Enum: 1=EPD 2=CERT 3=SCORE 4=SUBMITTAL 5=AUDIT
     */
    function anchor(
        bytes32 artifactHash,
        bytes32 contextHash,
        uint8   artifactType
    ) external onlyApprovedAnchor {
        require(artifactHash != bytes32(0), "AnchorRegistry: artifactHash required");
        require(contextHash  != bytes32(0), "AnchorRegistry: contextHash required");
        require(artifactType >= 1 && artifactType <= 5, "AnchorRegistry: invalid artifactType");

        emit AnchorCreated(
            artifactHash,
            contextHash,
            artifactType,
            msg.sender,
            block.timestamp
        );
    }
}
