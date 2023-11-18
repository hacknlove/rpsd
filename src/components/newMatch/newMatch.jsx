import { createSignal, onMount } from "solid-js";
import "./newMatch.scss";
import { fetchRest } from "@/js/fetchRest";

function dateFromNowToString(ms = 0) {
  const now = new Date(Date.now() + ms);
  now.setMilliseconds(0);
  now.setSeconds(0);
  const timezoneOffset = now.getTimezoneOffset() * 60000; // Convert minutes to milliseconds
  const localDateTimeWithOffset = new Date(now - timezoneOffset);
  const localDateTimeISOString = localDateTimeWithOffset
    .toISOString()
    .replace(/\..*?$/, "");
  return localDateTimeISOString;
}

function initnextAt(elemento) {
  elemento.setAttribute("min", dateFromNowToString(60 * 1000));
  elemento.setAttribute("max", dateFromNowToString(7 * 24 * 60 * 60 * 1000));
  elemento.setAttribute("value", dateFromNowToString(60 * 60 * 1000));
}

function localDateToIsoDate(dateString) {
  const date = new Date(dateString);
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

    JSON.nextAt = localDateToIsoDate(JSON.nextAt);

    const response = await fetchRest("newMatch", JSON);

    if (response.error) {
      alert(response.error);
      return setFormState({
        error: response.error,
      });
    }

    const url = new URL("/control", location);

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
      <h2>Create a new Match</h2>

      <label>Name of the room:</label>
      <input required type="text" placeholder="Name" name="name" />

      <label>starts at:</label>
      <input type="datetime-local" name="nextAt" use:initnextAt />

      <label>Admin Password</label>
      <input required type="password" placeholder="Password" name="password" />

      <button>Create</button>
    </form>
  );
}
