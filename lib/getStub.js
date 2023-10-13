async function extend(request, data) {
  const jsonData =
    request.headers.get("content-type") === "application/json"
      ? await request.json()
      : {};

  const searchParams = Object.fromEntries(new URL(request.url).searchParams);

  return Object.assign(jsonData, searchParams, data);
}

export async function fetchDO(context, action, data) {
  console.log("calling", action);
  data = await extend(context.request, data);

  const id = context.env.ROOM.idFromName(`${data.game}:${data.name}`);

  const stub = context.env.ROOM.get(id);

  const url = new URL(`http://do/${action}`);
  url.search = new URL(context.request.url).search;

  return stub.fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
