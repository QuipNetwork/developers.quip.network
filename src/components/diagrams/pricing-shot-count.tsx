import { Diagram } from "./Diagram";
import { data, layouts } from "./pricing-shot-count.data";

export { data };

export function PricingShotCount() {
  return <Diagram data={data} layouts={layouts} />;
}
