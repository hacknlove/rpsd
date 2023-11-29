import { websocket } from "@/js/connectWS";
import { createSignal, onCleanup, onMount } from "solid-js";
import "./Waiting.scss";

export function Waiting() {
  const [waiting, setWaiting] = createSignal(true);

  websocket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  });

  function onMessage(data) {
    switch (data.status) {
      case "waiting":
        setWaiting(true);
        break;
      case "playing":
        setWaiting(false);
        break;
      default:
        setWaiting(true);
    }
  }
  onMount(() => {
    if (websocket.lastEventData) {
      onMessage(websocket.lastEventData);
    }
  });

  websocket.addEventListener("close", () => {
    setWaiting(true);
  });

  return <>{waiting() && <div id="waiting">Waiting</div>}</>;
}
