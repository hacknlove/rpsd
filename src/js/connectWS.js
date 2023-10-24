let websocketTemp;

function clientSide() {
  const wsUrl = new URL("/api/ws", window.location.href);
  wsUrl.search = location.search;
  wsUrl.protocol = wsUrl.protocol.replace("http", "ws");

  websocketTemp = new WebSocket(wsUrl.toString());

  websocketTemp.addEventListener("error", () => {
    const hashData = new URLSearchParams(location.hash || "");

    const reconnect = +(hashData.get("reconnect") || 0) + 1;

    if (reconnect > 10) {
      location.pathname = "/";
      return;
    }

    hashData.set("reconnect", reconnect);

    setTimeout(() => {
      location.hash = hashData.toString();
      location.reload();
    }, 1000 * reconnect);
  });

  websocketTemp.addEventListener("open", () => {
    const hashData = new URLSearchParams(location.hash || "");
    hashData.delete("reconnect");
    location.hash = hashData.toString();
  });

  websocketTemp.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.debug(data);
    websocket.lastEventData = data;
  });
}

function serverSide() {
  websocketTemp = new EventTarget();
  websocketTemp.close = () => {};
  websocketTemp.send = () => {};
}

if (typeof window === "undefined") {
  serverSide();
} else {
  clientSide();
}

export const websocket = websocketTemp;
