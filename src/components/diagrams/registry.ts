import type { ComponentType } from "react";
import { ConceptsPipeline, data as conceptsPipeline } from "./concepts-pipeline";
import { HowQuipFitsTogether, data as howQuipFitsTogether } from "./how-quip-fits-together";
import { ParticipantsFlow, data as participantsFlow } from "./participants-flow";
import { QuipAccountPaths, data as quipAccountPaths } from "./quip-account-paths";
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
]);

export function bespokeDiagram(chart: string) {
  return registry.get(chart.trim());
}
