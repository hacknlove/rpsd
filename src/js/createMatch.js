import { fetchRest } from "./fetchRest";

function dateFromNowToString(ms = 0) {
  return new Date(Date.now() + ms).toISOString().replace(/\..*?$/, "");
}

function initStartAt() {
  const startAt = document.querySelector('input[name="startsAt"]');

  startAt.setAttribute("min", dateFromNowToString());
  startAt.setAttribute("max", dateFromNowToString(7 * 24 * 60 * 60 * 1000));
  startAt.setAttribute("value", dateFromNowToString(60 * 60 * 1000));
}

function ready() {
  initStartAt();

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

    const response = await fetchRest(
      "newMatch",
      Object.fromEntries(new FormData(form)),
    );

    console.log(response);

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

    const url = new URL(`/control/${form.game.value}`, location);

    url.searchParams.set("name", form.name.value);
    url.searchParams.set("token", response.token);
    url.searchParams.set("game", form.game.value);

    form.insertAdjacentHTML("afterend", `<a href="${url}"></a>`);
    form.nextElementSibling.click();
  });
}

document.addEventListener("astro:page-load", ready);
