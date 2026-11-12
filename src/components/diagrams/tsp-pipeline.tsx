import { Diagram } from "./Diagram";
import { data, layouts } from "./tsp-pipeline.data";

export { data };

export function TspPipeline() {
  return <Diagram data={data} layouts={layouts} />;
}
