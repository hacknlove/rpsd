import { websocket } from "@/js/connectWS";
import { createSignal, onCleanup, onMount } from "solid-js";
import "./Header.scss";

export function Header() {
  const [timeToStart, setTimeToStart] = createSignal(0);
  const [numberOfPlayers, setNumberOfPlayers] = createSignal(0);

  websocket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

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
  });

  function updateTimeToStart() {
    setTimeToStart(websocket.lastEventData.startsAt - Date.now());
  }

  let nextUpdateTimeout;
  function processInterval(miliseconds, interval, singular, plural) {
    const raw = miliseconds / interval;

    if (raw >= 1) {
      const show = Math.floor(raw);
      const milisecondsToNext = miliseconds - show * interval;

      clearTimeout(nextUpdateTimeout);
      nextUpdateTimeout = setTimeout(updateTimeToStart, milisecondsToNext);

      return `${show} ${show > 1 ? plural : singular}`;
    }
  }

  function formatedTimeToStart() {
    const miliseconds = timeToStart();

    return (
      processInterval(miliseconds, 1000 * 60 * 60 * 24, "day", "days") ||
      processInterval(miliseconds, 1000 * 60 * 60, "hour", "hours") ||
      processInterval(miliseconds, 1000 * 60, "minute", "minutes") ||
      processInterval(miliseconds, 1000, "second", "seconds")
    );
  }

  return (
    <header id="Header">
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
