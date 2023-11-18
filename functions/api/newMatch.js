import { z } from "zod";
import { fetchDO } from "lib/getStub";
import { signData, signSearchParams } from "lib/sign";
import { sendRestJSON } from "lib/sendRestJSON";

const schema = z.object({
  nextAt: z.string().datetime(),
  password: z.string(),
});

export async function onRequest(context) {
  const data = await context.request.json();

  context.request.json = () => data;

  data.password = await signData(context.env.SALT, data.name + data.password);

  const response = await fetchDO({ context, action: "newMatch", schema }).then(
    (r) => r.json(),
  );

  if (response.error) {
    return sendRestJSON(response);
  }

  const searchParams = new URLSearchParams({
    name: data.name,
    id: response.id,
    password: data.password,
  });

  await signSearchParams(context.env.SALT, searchParams);

  return sendRestJSON({
    search: searchParams.toString(),
  });
}
