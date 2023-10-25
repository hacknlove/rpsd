import { websocket } from "@/js/connectWS";
import { createSignal, onCleanup, onMount } from "solid-js";
import "./Header.scss";

export function Header() {
  const [timeToNext, setTimeToNext] = createSignal(0);
  const [numberOfPlayers, setNumberOfPlayers] = createSignal(0);

  websocket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.debug(data);

    if (data.nextAt) {
      setTimeToNext(data.nextAt - Date.now());
    }

    if (data.totalPlayers) {
      setNumberOfPlayers(data.totalPlayers);
    }
  });

  onMount(() => {
    if (websocket.lastEventData) {
      setTimeToNext(websocket.lastEventData.nextAt - Date.now());
      setNumberOfPlayers(websocket.lastEventData.totalPlayers);
    }
  });

  function updateTimeToNext() {
    setTimeToNext(websocket.lastEventData.nextAt - Date.now());
  }

  let nextUpdateTimeout;
  function processInterval(miliseconds, interval, singular, plural) {
    const raw = miliseconds / interval;

    if (raw >= 1) {
      let show = Math.floor(raw);
      const milisecondsToNext = miliseconds - show * interval;

      clearTimeout(nextUpdateTimeout);
      nextUpdateTimeout = setTimeout(updateTimeToNext, milisecondsToNext + 1);

      return `${interval > 1000 ? "Over " : ""}${show} ${
        show > 1 ? plural : singular
      }`;
    }
  }

  function formatedTimeToNext() {
    const miliseconds = timeToNext();

    return (
      processInterval(miliseconds, 1000 * 60 * 60 * 24, "day", "days") ||
      processInterval(miliseconds, 1000 * 60 * 60, "hour", "hours") ||
      processInterval(miliseconds, 1000 * 60, "minute", "minutes") ||
      processInterval(miliseconds, 1000, "second", "seconds")
    );
  }

  return (
    <header id="Header">
      <div class="stats" id="timeToNext">
        <span>Time to start:</span>
        <span>{formatedTimeToNext()} </span>
      </div>
      <div class="stats" id="numberOfPlayers">
        <span>Number of players:</span>
        <span>{numberOfPlayers()}</span>
      </div>
    </header>
  );
}
