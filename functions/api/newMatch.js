import { fetchDO } from "lib/getStub";

export function onRequest(context) {
  return fetchDO(context, "newMatch");
}
