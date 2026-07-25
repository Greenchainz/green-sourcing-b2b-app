// server/routers/blockchain-proof/anchorRegistryAbi.ts
// Typed ABI for AnchorRegistry.sol — keep in sync with contracts/AnchorRegistry.sol

export const anchorRegistryAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approvedAnchors",
    inputs: [{ name: "anchor", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setApprovedAnchor",
    inputs: [
      { name: "anchor",   type: "address", internalType: "address" },
      { name: "approved", type: "bool",    internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "anchor",
    inputs: [
      { name: "artifactHash", type: "bytes32", internalType: "bytes32" },
      { name: "contextHash",  type: "bytes32", internalType: "bytes32" },
      { name: "artifactType", type: "uint8",   internalType: "uint8"   },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "AnchorCreated",
    inputs: [
      { name: "artifactHash", type: "bytes32", indexed: true  },
      { name: "contextHash",  type: "bytes32", indexed: true  },
      { name: "artifactType", type: "uint8",   indexed: true  },
      { name: "anchoredBy",   type: "address", indexed: false },
      { name: "timestamp",    type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AnchorPermissionUpdated",
    inputs: [
      { name: "anchor",   type: "address", indexed: true  },
      { name: "approved", type: "bool",    indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true },
      { name: "newOwner",      type: "address", indexed: true },
    ],
    anonymous: false,
  },
] as const;
