---
description: >-
  The two SDKs Quip Network publishes, and which one to reach for.
icon: cube
---

# Quip SDK

Quip Network publishes two SDKs:

1. An SDK for quantum smart contracts and hybrid solvers, that helps you construct supercharged solutions for optimization and satisfiability problems, artificial intelligence tasks, or even Bitcoin mining.

This SDK is meant to help you work with quantum computers of all kinds: adiabatic quantum computers like annealers, or gate-based quantum computers that support certain operations which make it easier to reason about generalized quantum computation.

2. An SDK for existing smart contracts that lets you upgrade your contracts one ABI at a time. Simply import the file using your favorite package manager and reference the SDK anytime you need to unwrap a post-quantum commitment into its associated classical public key.

The most versatile usecase of the Quip wallet SDK is a smart account much like a Coinbase smart account or a Safe wallet, which wraps any contract with a post-quantum signature read and aborts the subsequent contract call if the read fails.

However, sometimes contracts may require token allowances, specialized permissions, or access to collateral held in the contract. For these usecases, it is necessary for the contract to implement the Quip SDK's post-quantum ABI extension directly.
