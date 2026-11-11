---
description: >-
  Quantum hardware is billed per task plus per shot, per second of processor
  time, or per job. Compare the billing models and pick one for a development
  loop.
icon: receipt
---

# Quantum compute pricing models compared

Quantum cloud providers bill hardware access per task plus per shot, per second of processor time, or per job. For iterative development, run most of the loop on a free simulator, and expect per-shot hardware to stay expensive for small runs, because the fixed per-task fee makes up most of the bill when the shot count is low.

## Billing models by provider

The table summarizes each provider's pricing page as read on November 11, 2026.

| Provider | Unit charged | Bill grows with | Free option for development |
| --- | --- | --- | --- |
| [Amazon Braket](https://aws.amazon.com/braket/pricing/) | A fee per task plus a fee per shot, or an hourly reservation | Number of tasks and shots | Local simulator in the Braket SDK |
| [IBM Quantum](https://www.ibm.com/quantum/pricing) | Seconds of usage on the Pay-As-You-Go plan | Runtime | Open Plan, up to 10 minutes of runtime per month |
| [Azure Quantum with IonQ](https://learn.microsoft.com/en-us/azure/quantum/pricing) | Gate-shots, billed in Azure Quantum Tokens, with a minimum price per program | Gates multiplied by shots | IonQ simulator |
| [Azure Quantum with Rigetti](https://learn.microsoft.com/en-us/azure/quantum/pricing) | Job execution time, in 10 millisecond increments | Runtime | Rigetti QVM simulator |
| [Quip Network](/docs/compute/submit-a-job#what-a-job-costs) (Aglais test network) | A reward you set for each job, plus a transaction fee | Your reward, and model size for the fee | Local CPU solver in `xqsa` |

## Per task plus per shot

Amazon Braket charges two amounts for each run on a quantum processing unit (QPU): a $0.30 task fee on every device, and a per-shot fee set by the device. Braket's own example runs 10,000 shots on Rigetti Cepheus at $0.000425 per shot, for $4.25 in shots plus $0.30 for the task, $4.55 in total.

At the same rates, a 100-shot debugging run costs $0.0425 in shots and $0.30 for the task. The task fee now accounts for nearly 90% of the $0.34 bill, and you save almost nothing by cutting shots further. On this model, run fewer hardware tasks during development, and send to hardware only circuits already checked in a simulator.

Azure Quantum bills IonQ hardware by gate-shots, at rates such as $0.000975 per two-qubit-gate shot on Aria 1, with a minimum price for each program execution ($12.4166 on Aria 1 with error mitigation off, $97.50 with it on). Above that minimum, the bill rises with gate count as well as shot count, so you lower it by removing gates or by running fewer shots. Below it, the minimum plays the same role as the Braket task fee.

## Per second of processor time

IBM Quantum bills its Pay-As-You-Go plan per second of usage, with prices quoted per minute starting at $96. Azure Quantum bills Rigetti hardware on job execution time alone, at $0.02 per 10 milliseconds on Cepheus-1-108Q. Under either plan, you pay for a job's running time.

For a development loop, IBM's Open Plan gives up to 10 minutes of runtime each month at no charge. Budget those minutes for checks on real hardware once a circuit behaves correctly in simulation.

## Per job

Quip Network prices optimization work by the job. You describe the problem as an [Ising model](/docs/compute/submit-a-job#describe-your-problem-as-an-ising-model), attach a reward and post the job. Miners then compete to return the lowest-energy answer. The chain reserves your reward when you post and pays it to the winning miners, and the transaction fee grows with the size of your model.

Since the chain [charges for the reward and the fee alone](/docs/compute/submit-a-job#what-a-job-costs), a job costs the same whether a miner finishes in a second or a minute. On the Aglais test network, the minimum reward is 1 AGLS, and the faucet hands out AGLS for free.

For iterative work, the `xqsa` package runs a local CPU solver through the same `solve()` call as the network backend. You develop the model on your own machine at no cost, then change the solver line to send it to the network. Before sending a job, call `create_order(model).quote()`. It returns your reward plus the fee the chain quotes for the job, and checks your balance, without submitting anything.

## Picking a model for a development loop

1. Debug on a free simulator first: the Braket local simulator, the IonQ or Rigetti simulators on Azure, or the `xqsa` CPU solver for optimization models.
2. On per-task plus per-shot hardware, keep the number of tasks low. Below roughly 700 shots on Rigetti Cepheus through Braket, the $0.30 task fee makes up most of the bill.
3. On per-second hardware, keep jobs short and spend any free monthly minutes on validation runs.
4. On per-job billing, set the reward yourself and check the quote before submitting. Runtime does not change the price.

## Next step

[Submit your first compute job](/docs/compute/submit-a-job) walks through installing the tools, posting a model to the Aglais test network and reading the result.
