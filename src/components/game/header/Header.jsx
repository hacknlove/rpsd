import { websocket } from "@/js/connectWS";
import { createSignal, onCleanup, onMount } from "solid-js";
import './Header.scss';

export function Header() {
  const [timeToStart, setTimeToStart] = createSignal(0);
  const [numberOfPlayers, setNumberOfPlayers] = createSignal(0);

  websocket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    console.log(data);

    if (data.startsAt) {
      setTimeToStart(data.startsAt - Date.now());
    }

    if (data.totalPlayers) {
      setNumberOfPlayers(data.totalPlayers);
    }
  });

  onMount(() => {
    if (websocket.lastEventData) {
      setTimeToStart(websocket.lastEventData.startsAt - Date.now());
      setNumberOfPlayers(websocket.lastEventData.totalPlayers);
    }
    console.log({ websocket });
  });

  function formatedTimeToStart() {
    const seconds = Math.floor(timeToStart / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      return `${seconds} second${seconds !== 1 ? "s" : ""}`;
    }
  }

  return (
    <header>
      <div class="stats" id="timeToStart">
        <span>Time to start:</span>
        <span>{formatedTimeToStart()} </span>
      </div>
      <div class="stats" id="numberOfPlayers">
        <span>Number of players:</span>
        <span>{numberOfPlayers()}</span>
      </div>
    </header>
  );
}
