const wsUrl = new URL("/api/ws", window.location.href);
wsUrl.search = location.search;
wsUrl.protocol = wsUrl.protocol.replace("http", "ws");

export const websocket = new WebSocket(wsUrl.toString());

let reconnect = 10;

websocket.addEventListener("error", () => {
  if (reconnect--) {
    setTimeout(
      () => {
        location.reload();
      },
      1000 * (10 - reconnect),
    );
  }
});

websocket.addEventListener("open", () => {
  reconnect = 10;
});
