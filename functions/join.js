import { fetchDO } from "lib/getStub";
import { sendRestJSON } from "lib/sendRestJSON";
import { signSearchParams, verifySearchParams } from "lib/sign";
import { z } from "zod";

const schema = z.object({
  id: z.string(),
  mode: z.string(),
});

export async function onRequest(context) {
  const url = new URL(context.request.url);

  url.searchParams.forEach((value, key) => {
    if (key.startsWith("utm_")) {
      url.searchParams.delete(key);
    }
  });

  if (!verifySearchParams(context.env.SALT, url.searchParams)) {
    return new Response("Invalid Signature", {
      status: 403,
    });
  }

  const isAvailable = await fetchDO({
    context,
    action: "isAvailable",
    schema,
  });

  console.log({ isAvailable });

  if (isAvailable.error) {
    return sendRestJSON(isAvailable);
  }

  url.searchParams.delete("_s");
  url.searchParams.delete("mode");
  url.searchParams.set("playerId", crypto.randomUUID());

  signSearchParams(context.env.SALT, url.searchParams);

  return new Response(null, {
    status: 302,
    headers: {
      Location: `/play${url.search}`,
    },
  });
}
