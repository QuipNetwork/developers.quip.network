import { Diagram } from "./Diagram";
import { data, layouts } from "./concepts-pipeline.data";

export { data };

export function ConceptsPipeline() {
  return <Diagram data={data} layouts={layouts} />;
}
