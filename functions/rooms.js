export async function onRequest(context) {
  const upgradeHeader = context.request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  const url = new URL(context.request.url);

  const room = url.searchParams.get("room");

  const id = context.env.ROOM.idFromName(`Room:${room}`);

  const stub = context.env.ROOM.get(id);

  return stub.fetch(context.request);
}
