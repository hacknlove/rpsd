export async function onRequest(context) {
  const url = new URL(context.request.url);

  const name = url.searchParams.get("name");
  const game = url.searchParams.get("game");

  const id = context.env.ROOM.idFromName(`${game}:${name}`);

  const stub = context.env.ROOM.get(id);

  const stubUrl = new URL("http://do/ws");

  const upgradeHeader = context.request.headers.get("Upgrade");
  if (upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  return stub.fetch(stubUrl, {
    headers: {
      Upgrade: "websocket",
    },
  });
}
