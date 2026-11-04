import { Diagram } from "./Diagram";
import { data, layouts } from "./participants-flow.data";

export { data };

export function ParticipantsFlow() {
  return <Diagram data={data} layouts={layouts} />;
}
