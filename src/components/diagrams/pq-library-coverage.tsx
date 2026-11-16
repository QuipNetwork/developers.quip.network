import { Diagram } from "./Diagram";
import { data, layouts } from "./pq-library-coverage.data";

export { data };

export function PqLibraryCoverage() {
  return <Diagram data={data} layouts={layouts} />;
}
