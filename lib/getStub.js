import { z } from "zod";
import { sendRestJSON } from "./sendRestJSON";

async function extend(request, data) {
  const jsonData =
    request.headers.get("content-type") === "application/json"
      ? await request.json()
      : {};

  const searchParams = Object.fromEntries(new URL(request.url).searchParams);

  return Object.assign(jsonData, searchParams, data);
}

const minimalSchema = z.object({
  name: z.string(),
  game: z.enum(["rpsd", "ss"]),
});

export async function fetchDO({ context, action, data, schema, headers }) {
  data = await extend(context.request, data);

  const { name, game } = minimalSchema.parse(data);

  if (schema) {
    try {
      data = schema.parse(data);
      data.name = name;
      data.game = game;
    } catch (error) {
      console.error(JSON.stringify(error.issues, null, 2));
      return sendRestJSON({
        status: 400,
        error: error.issues.map((issue) => issue.message).join(", "),
      });
    }
  }

  const id = context.env.ROOM.idFromName(`${data.game}:${data.name}`);

  const stub = context.env.ROOM.get(id);

  const url = new URL(`http://do/${action}`);
  url.search = new URL(context.request.url).search;

  return stub.fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(data),
  });
}
