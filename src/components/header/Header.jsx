import { websocket } from "@/js/connectWS";
import { createSignal, onCleanup, onMount } from "solid-js";
import "./Header.scss";

export function Header() {
  const [timeToNext, setTimeToNext] = createSignal(0);
  const [numberOfPlayers, setNumberOfPlayers] = createSignal(0);
  const [labelForNext, setLabelForNext] = createSignal("");

  websocket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  });

  function onMessage(data) {
    console.log(data);
    if (data.nextAt) {
      console.log("here");
      setTimeToNext(data.nextAt - Date.now());
    }

    if (data.playerCount !== undefined) {
      setNumberOfPlayers(data.playerCount);
    }

    switch (data.status) {
      case "waiting":
        setLabelForNext("Time to start");
        break;
      case "playing":
        setLabelForNext("Time to next");
        break;
      case "ended":
        setLabelForNext("");
    }
  }

  onMount(() => {
    if (websocket.lastEventData) {
      onMessage(websocket.lastEventData);
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
    console.log(miliseconds);

    const text =
      processInterval(miliseconds, 1000 * 60 * 60 * 24, "day", "days") ||
      processInterval(miliseconds, 1000 * 60 * 60, "hour", "hours") ||
      processInterval(miliseconds, 1000 * 60, "minute", "minutes") ||
      processInterval(miliseconds, 1000, "second", "seconds") ||
      "0 seconds";

    document.title = text;
    return text;
  }

  return (
    <header id="Header">
      {labelForNext() && (
        <div class="stats" id="timeToNext">
          <span>{labelForNext()}: </span>
          <span>{formatedTimeToNext()} </span>
        </div>
      )}
      <div class="stats" id="numberOfPlayers">
        <span>Number of players:</span>
        <span>{numberOfPlayers()}</span>
      </div>
    </header>
  );
}
