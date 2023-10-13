export async function fetchRest(action, data, options = {}) {
  options = Object.assign(
    {
      method: "GET",
    },
    options,
  );

  if (data) {
    options.method = "POST";
    if (data instanceof FormData) {
      options.body = JSON.stringify(Object.fromEntries(data));
    } else {
      options.body = JSON.stringify(data);
    }
    options.headers ??= {};
    options.headers["Content-Type"] = "application/json";
  }

  const url = new URL(location);
  url.pathname = `/api/${action}`;
  const response = await fetch(url, options);

  if (!response.ok) {
    return {
      error: response.statusText,
    };
  }

  return response.json().catch(() => ({ error: "Something went wrong" }));
}
