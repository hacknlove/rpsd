import { fetchDO } from "lib/getStub";
import { verifySearchParams } from "lib/sign";
import { z } from "zod";

const schema = z.object({
  id: z.string(),
  playerId: z.string().optional(),
  password: z.string().optional(),
});

export async function onRequest(context) {
  const upgradeHeader = context.request.headers.get("Upgrade");
  if (upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  const url = new URL(context.request.url);

  if (!verifySearchParams(context.env.SALT, url.searchParams)) {
    return new Response("Invalid Signature", {
      status: 403,
    });
  }

  return fetchDO({
    context,
    action: "ws",
    schema,
    headers: {
      Upgrade: "websocket",
    },
  });
}
