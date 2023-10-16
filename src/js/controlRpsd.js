import { fetchRest } from "./fetchRest";

const wsUrl = new URL("/api/ws", window.location.href);

wsUrl.search = location.search;
wsUrl.protocol = wsUrl.protocol.replace("http", "ws");

const websocket = new WebSocket(wsUrl.toString());

websocket.addEventListener("open", (event) => {
  console.debug("Connection established");
  console.debug(event);
});

websocket.addEventListener("message", (event) => {
  console.debug("Message received from server");
  console.debug(event.data);
});

async function copyPlayerLink() {
  const link = await fetchRest("getOpenLink", {});

  if (link.error) {
    alert("An error occurred while generating the link");
    return;
  }

  const playerLink = new URL("/join", location);

  playerLink.search = link.search;

  await navigator.clipboard.writeText(playerLink.toString());

  alert("Copied link to clipboard");
}

function ready() {
  const playerLink = document.getElementById("copyPlayerLink");

  playerLink.addEventListener("click", copyPlayerLink);
}

document.addEventListener("DOMContentLoaded", ready);
