import { createOpenAPI } from "fumadocs-openapi/server";
import { FaucetApiPage } from "./faucet-api-page";

const SPEC = "openapi/faucet.yaml";
const openapi = createOpenAPI({ input: [SPEC] });

/** One operation of openapi/faucet.yaml. Pages are static, so the file is read at build. */
export async function FaucetApi({ path, method }: { path: string; method: "get" | "post" }) {
  const { bundled } = await openapi.getSchema(SPEC);
  return <FaucetApiPage payload={{ bundled }} operations={[{ path, method }]} showTitle={false} />;
}
