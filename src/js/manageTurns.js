import { websocket } from "@/js/connectWS";

let nextUpdateTimeout;

websocket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  if (!data.nextAt) {
    return;
  }

  const nextAtms = data.nextAt - Date.now();

  if (nextAtms <= 0) {
    return;
  }

  if (nextUpdateTimeout) {
    clearTimeout(nextUpdateTimeout);
  }

  nextUpdateTimeout = setTimeout(() => {
    websocket.send(
      JSON.stringify({
        type: "nextTurn",
        status: data.status,
        nextAt: data.nextAt,
      }),
    );
  }, nextAtms);
});
