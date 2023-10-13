import { fetchDO } from "lib/getStub";

export async function onRequest(context) {
  return fetchDO(context, "getOpenLink");
}
