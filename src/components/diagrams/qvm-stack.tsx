import { Diagram } from "./Diagram";
import { data, layouts } from "./qvm-stack.data";

export { data };

export function QvmStack() {
  return <Diagram data={data} layouts={layouts} />;
}
