import { Diagram } from "./Diagram";
import { data, layouts } from "./who-pays-whom.data";

export { data };

export function WhoPaysWhom() {
  return <Diagram data={data} layouts={layouts} />;
}
