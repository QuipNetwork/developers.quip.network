import { Diagram } from "./Diagram";
import { data, layouts } from "./bridge-audit-scope.data";

export { data };

export function BridgeAuditScope() {
  return <Diagram data={data} layouts={layouts} />;
}
