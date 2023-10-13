import { fetchRest } from "./fetchRest";

const currentUrl = new URL(window.location.href);

const wsUrl = new URL("/api/ws", window.location.href);

wsUrl.search = location.search;
wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
wsUrl.searchParams.set("game", "rpsd");
wsUrl.searchParams.set("name", currentUrl.searchParams.get("name"));

const websocket = new WebSocket(wsUrl.toString());

websocket.addEventListener("open", (event) => {
  console.log("Connection established");
  console.log(event);
});

websocket.addEventListener("message", (event) => {
  console.log("Message received from server");
  console.log(event.data);
});

async function copyPlayerLink() {
  const link = await fetchRest("getOpenLink", {});

  console.log(link);

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

document.addEventListener("astro:page-load", ready);
