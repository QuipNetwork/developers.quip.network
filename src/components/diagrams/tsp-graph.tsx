import { Diagram } from "./Diagram";
import { data, layouts } from "./tsp-graph.data";

export { data };

export function TspGraph() {
  return <Diagram data={data} layouts={layouts} />;
}
