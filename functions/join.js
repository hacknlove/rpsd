import { fetchDO } from "lib/getStub";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  url.searchParams.forEach((value, key) => {
    if (key.startsWith("utm_")) {
      url.searchParams.delete(key);
    }
  });

  const response = await fetchDO(
    context,
    "joinOpen",
    null,
    url.searchParams.toString(),
  );

  console.log(response);

  if (response.error) {
    return new Response(response.error, {
      status: 400,
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: `/play/rpsd?${response.search}`,
    },
  });
}
