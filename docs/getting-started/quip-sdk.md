---
icon: folder-tree
---

# Quip SDK

Quip Network publishes an SDK for existing smart contracts that lets you upgrade your contracts one ABI at a time. Simply import the file using your favorite package manager and reference the SDK anytime you need to unwrap a post-quantum commitment into its associated classical public key.

The most versatile usecase of the Quip SDK is a smart account much like a Coinbase smart account or a Safe wallet, which wraps any contract with a post-quantum signature read and aborts the subsequent contract call if the read fails.

However, sometimes contracts may require token allowances, specialized permissions, or access to collateral held in the contract. For these usecases, it is necessary for the contract to implement the Quip SDK's post-quantum ABI extension directly.
