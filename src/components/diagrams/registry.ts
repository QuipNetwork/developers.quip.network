import type { ComponentType } from "react";
import { BridgeAuditScope, data as bridgeAuditScope } from "./bridge-audit-scope";
import { ConceptsPipeline, data as conceptsPipeline } from "./concepts-pipeline";
import { HowQuipFitsTogether, data as howQuipFitsTogether } from "./how-quip-fits-together";
import { ParticipantsFlow, data as participantsFlow } from "./participants-flow";
import { PqLibraryCoverage, data as pqLibraryCoverage } from "./pq-library-coverage";
import { PqSignatureSizes, data as pqSignatureSizes } from "./pq-signature-sizes";
import { PricingShotCount, data as pricingShotCount } from "./pricing-shot-count";
import { QuipAccountPaths, data as quipAccountPaths } from "./quip-account-paths";
import { QvmStack, data as qvmStack } from "./qvm-stack";
import { ThreePrograms, data as threePrograms } from "./three-programs";
import { TspGraph, data as tspGraph } from "./tsp-graph";
import { TspPipeline, data as tspPipeline } from "./tsp-pipeline";
import { WhoPaysWhom, data as whoPaysWhom } from "./who-pays-whom";

/** Keyed by the exact chart text. A changed chart misses and falls back to Mermaid. */
const registry = new Map<string, ComponentType>([
  [howQuipFitsTogether.source, HowQuipFitsTogether],
  [whoPaysWhom.source, WhoPaysWhom],
  [participantsFlow.source, ParticipantsFlow],
  [quipAccountPaths.source, QuipAccountPaths],
  [conceptsPipeline.source, ConceptsPipeline],
  [threePrograms.source, ThreePrograms],
  [tspPipeline.source, TspPipeline],
  [tspGraph.source, TspGraph],
  [qvmStack.source, QvmStack],
  [pqSignatureSizes.source, PqSignatureSizes],
  [bridgeAuditScope.source, BridgeAuditScope],
  [pricingShotCount.source, PricingShotCount],
  [pqLibraryCoverage.source, PqLibraryCoverage],
]);

export function bespokeDiagram(chart: string) {
  return registry.get(chart.trim());
}
