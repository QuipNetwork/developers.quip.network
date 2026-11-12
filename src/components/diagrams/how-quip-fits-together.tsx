import { Diagram } from "./Diagram";
import { data, layouts } from "./how-quip-fits-together.data";

export { data };

export function HowQuipFitsTogether() {
  return <Diagram data={data} layouts={layouts} />;
}
