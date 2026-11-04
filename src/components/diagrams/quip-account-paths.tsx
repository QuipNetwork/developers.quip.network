import { Diagram } from "./Diagram";
import { data, layouts } from "./quip-account-paths.data";

export { data };

export function QuipAccountPaths() {
  return <Diagram data={data} layouts={layouts} />;
}
