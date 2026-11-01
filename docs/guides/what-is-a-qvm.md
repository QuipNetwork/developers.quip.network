---
description: >-
  QVM stands for quantum virtual machine, and the term covers two kinds of
  software. See how they differ, then run a job on the Quip Network QVM.
icon: microchip
---

# What is a QVM?

A QVM, or quantum virtual machine, is software that runs quantum programs without tying them to a single physical quantum processor. The term covers two different kinds of tool, so check which one a page means before you install anything.

Simulators run on classical computers and imitate quantum hardware. Rigetti's [open-source QVM](https://github.com/quil-lang/qvm) simulates programs written in its Quil language, and Google's [Quantum Virtual Machine](https://quantumai.google/cirq/simulate/quantum_virtual_machine) uses noise data to mimic its own processors.

An execution layer takes one program and sends it to real machines. Quip Network's [QVM](https://quip.network/blog/qvm-launch) works this way: you write the problem once, then choose where it runs. It is [live on the Aglais testnet](https://quip.network/blog/qvm-launch).

| | Rigetti QVM | Google Quantum Virtual Machine | Quip Network QVM |
| --- | --- | --- | --- |
| **Purpose** | Simulate Quil programs | Mimic Google processors | Run one program across different backends |
| **Runs on** | Classical computer | Classical computer | [CPU, GPU, D-Wave quantum annealer or the Quip Network](/docs/xquad-toolchain#backends) |
| **Program format** | Quil | Cirq circuits | [Quadratic models](/docs/xquad-toolchain#what-it-models), written in a constraint language or built in Python |

## Which problems the Quip QVM runs

The [XQuad toolchain](/docs/xquad-toolchain) handles combinatorial problems that reduce to quadratic binary models. Route planning, graph coloring, knapsack and portfolio optimization all fall in range. If your work needs a gate-level circuit simulator for research, the Rigetti and Google tools above are built for that job.

## Run a job on your own machine

You need Python 3.13 or newer. Start by installing the toolchain:

```sh
pip install "xquad[quip]"
```

This example describes a small problem and solves it on your CPU, with no account and no network connection. Variable 0 gets a reward for being on, and the pair gets a penalty when both variables are on:

```python
from xqffi.vm import XqmxModel
from xqsa import SolverCPU

model = XqmxModel.binary(2)
model.set_linear(0, -1)
model.set_quad(0, 1, 2)

result = SolverCPU().solve(model)
print(result.sample.values, result.energy)
```

The solver looks for the lowest energy, so it turns on variable 0 and leaves variable 1 off:

```
[1, 0] -1
```

## Send the same model to the network

To move the job to the network, change the solver and keep the model:

```python
from xqsa.quip import SolverQuip

solver = SolverQuip.for_network("aglais")
print(solver.create_order(model).quote())

result = solver.solve(model)
print(result.sample.values, result.energy)
```

The first run creates a keystore at `~/.quip/keystore.json` and draws test tokens from the faucet. Keep the keystore private. AGLS, the test token, [holds no value](https://aglais.quip.network), so this job costs you nothing real.

When we ran this model on November 1, 2026, the quote came to 1.002 AGLS: a 1 AGLS reward plus a fee of about 0.002 AGLS. A miner returned the same answer in about 93 seconds, and the chain's recorded energy matched the result. Expect the amounts to change with runtime upgrades, because they come from the chain at the time you ask.

## Where to go next

[Submit your first compute job](/docs/compute/submit-a-job) covers payout rules, deadlines, quality floors and what happens to a job after you post it. [Ising topologies](/docs/compute/ising-topologies) explains how models map onto hardware.
