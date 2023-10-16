export function sendRestJSON(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
    },
  });
}
