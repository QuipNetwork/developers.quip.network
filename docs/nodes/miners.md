---
description: >-
  The two families of mining hardware: classical platforms (CPUs, GPUs,
  TPUs, NPUs) and quantum platforms supporting entanglement.
icon: microchip
---

# Miners

Two families of hardware mine on Quip Network.

**Classical miners** are the compute platforms that do not support entanglement: CPUs, GPUs, TPUs, NPUs, and the like. While the network often leads with quantum computing as a differentiator, these traditional architectures are first-class citizens that help validate the quantum computers are really delivering improved performance. The network currently publishes Metal and CUDA solvers as well as direct implementations for x86 and ARM CPUs.

**Quantum miners** are any compute platform that supports entanglement through adiabatic quantum computing, or gate-based platforms featuring CNOT or Toffoli gates: neutral atom, trapped ion, superconducting, photonic, or otherwise. The ultimate goal of the network is to maximize the utilization of all quantum processors everywhere and to connect them together to solve the hardest problems as one unified quantum system.

#### Node Requirements

Node requirements are minimal. There is no barrier to entry for running a node, but you will have to fit the blockchain on local storage and your block rewards will be correlated with your ability to efficiently solve the Proofs of Useful Work supported by the network.

The first Proof of Useful Work is finding the ground state energy of a Hamiltonian, often called an Ising Model problem. These solutions can be used in a variety of optimization and constraint programming problems, providing useful outputs for real businesses. Future Proofs of Useful Work may include things like Verifiable Random Functions, Hidden Subgroup Problems, Search, Quantum Key Distribution, or otherwise.

The network currently publishes Qiskit and Ocean SDK solutions for the Ising subnet. If you have another framework or instruction set you would like to support, please submit an issue at our [Github](https://github.com/quipnetwork).

{% hint style="danger" %}
**Needs review.** Newer internal records show the July 2026 toolchain shipped CPU, GPU, and D-Wave (Ocean) solvers, with gate-model support (which Qiskit implies) still unbuilt. The Qiskit claim above may be premature. If you know the current solver lineup, answer under **R7 — Qiskit** on the [Quip Docs Review page](https://app.notion.com/p/3b5db8c6a08881788c00e65ad15ad6c4).
{% endhint %}

#### Run a Node

Please see the [Run a Node](run-a-node-testnet.md) section.
