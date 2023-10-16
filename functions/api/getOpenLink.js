import { fetchDO } from "lib/getStub";
import { sendRestJSON } from "lib/sendRestJSON";
import { signSearchParams, verifySearchParams } from "lib/sign";
import { z } from "zod";

const schema = z.object({
  id: z.string(),
  password: z.string(),
  _s: z.string(),
});

export async function onRequest(context) {
  const url = new URL(context.request.url);

  try {
    await verifySearchParams(context.env.SALT, url.searchParams);
  } catch (error) {
    return sendRestJSON({ error });
  }

  const isAdmin = await fetchDO({ context, action: "isAdmin", schema }).then(
    (r) => r.json(),
  );

  if (isAdmin.error) {
    return sendRestJSON(isAdmin);
  }

  url.searchParams.delete("_s");
  url.searchParams.delete("password");

  url.searchParams.set("mode", "unlimited");

  await signSearchParams(context.env.SALT, url.searchParams);

  return sendRestJSON({
    search: url.search,
  });
}
