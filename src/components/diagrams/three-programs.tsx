import { Diagram } from "./Diagram";
import { data, layouts } from "./three-programs.data";

export { data };

export function ThreePrograms() {
  return <Diagram data={data} layouts={layouts} />;
}
