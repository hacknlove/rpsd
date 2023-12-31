import { fetchRest } from "./fetchRest";

function dateFromNowToString(ms = 0) {
  return new Date(Date.now() + ms).toISOString().replace(/\..*?$/, "");
}

function initnextAt() {
  const nextAt = document.querySelector('input[name="nextAt"]');

  nextAt.setAttribute("min", dateFromNowToString());
  nextAt.setAttribute("max", dateFromNowToString(7 * 24 * 60 * 60 * 1000));
  nextAt.setAttribute("value", dateFromNowToString(60 * 60 * 1000));
}

function ready() {
  initnextAt();

  const form = document.querySelector("form");
  const button = form.querySelector("button");
  const inputName = form.querySelector('input[name="name"]');

  form.childNodes.forEach((node, key) => {
    node.style.viewTransitionName = `form-${key}`;
  });

  form.addEventListener("submit", async () => {
    document.startViewTransition(() => {
      button.innerText = "Creating...";
      button.disabled = true;
    });

    const JSON = Object.fromEntries(new FormData(form));

    if (!JSON.nextAt.endsWith("Z")) {
      JSON.nextAt = JSON.nextAt + "Z"; // fix for zod validator
    }

    const response = await fetchRest("newMatch", JSON);

    if (response.error) {
      return document.startViewTransition(() => {
        inputName.style.borderColor = "red";
        button.innerText = "Errors";

        inputName.addEventListener(
          "focus",
          () => {
            inputName.style.borderColor = "";
            inputName.nextElementSibling.remove();
            button.innerText = "Create";
            button.disabled = false;
          },
          { once: true },
        );

        if (inputName.nextElementSibling.tagName !== "P") {
          inputName.insertAdjacentHTML(
            "afterend",
            `<p class="error">${response.error}</p>`,
          );
        }
      });
    }

    const url = new URL("/control", location);

    url.search = response.search;

    form.insertAdjacentHTML("afterend", `<a href="${url}"></a>`);
    form.nextElementSibling.click();
  });
}

document.addEventListener("DOMContentLoaded", ready, { once: true });
