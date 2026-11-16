import { Diagram } from "./Diagram";
import { data, layouts } from "./pq-signature-sizes.data";

export { data };

export function PqSignatureSizes() {
  return <Diagram data={data} layouts={layouts} />;
}
