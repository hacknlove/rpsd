import { createSignal, onMount } from "solid-js";
import "./newMatch.scss";
import { fetchRest } from "@/js/fetchRest";

function dateFromNowToString(ms = 0) {
  const now = new Date(Date.now() + ms);
  const timezoneOffset = now.getTimezoneOffset() * 60000; // Convert minutes to milliseconds
  const localDateTimeWithOffset = new Date(now - timezoneOffset);
  const localDateTimeISOString = localDateTimeWithOffset
    .toISOString()
    .replace(/\..*?$/, "");
  return localDateTimeISOString;
}

function initStartsAt(elemento) {
  elemento.setAttribute("min", dateFromNowToString());
  elemento.setAttribute("max", dateFromNowToString(7 * 24 * 60 * 60 * 1000));
  elemento.setAttribute("value", dateFromNowToString(60 * 60 * 1000));
}

function localDateToIsoDate(dateString) {
  debugger;
  const date = new Date(dateString);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  const localDateTimeISOString = date.toISOString().replace(/\..*?$/, "");
  return localDateTimeISOString + "Z";
}

export function NewMatch() {
  const [formState, setFormState] = createSignal({});
  async function onSubmit(event) {
    setFormState({
      loading: true,
    });

    const form = event.target;

    const JSON = Object.fromEntries(new FormData(form));

    JSON.startsAt = localDateToIsoDate(JSON.startsAt);

    const response = await fetchRest("newMatch", JSON);

    if (response.error) {
      alert(response.error);
      return setFormState({
        error: response.error,
      });
    }

    const url = new URL(`/control/${form.game.value}`, location);

    url.search = response.search;

    form.insertAdjacentHTML("afterend", `<a href="${url}"></a>`);
    form.nextElementSibling.click();
  }

  return (
    <form
      class="NewMatch"
      classList={formState()}
      method="dialog"
      onSubmit={onSubmit}
    >
      <label>Name of the room:</label>
      <input required type="text" placeholder="Name" name="name" />

      <label>Kind of game:</label>
      <select name="game">
        <option value="rpsd">Rock, Paper, Scissors, Duck</option>
        <option value="ss">Simon says</option>
      </select>

      <label>starts at:</label>
      <input type="datetime-local" name="startsAt" use:initStartsAt />

      <label>Admin Password</label>
      <input required type="password" placeholder="Password" name="password" />

      <label>Create:</label>
      <button>Create</button>
    </form>
  );
}