import { websocket } from "./connectWS";

function start() {
  initializeGame();
  initializeCountDown();
}

function update(data) {
  console.debug("update");
  console.debug(data);
}

websocket.addEventListener("open", () => {
  const url = new URL(location);
  websocket.send(
    JSON.stringify({
      action: "join",
      playerId: url.searchParams.get("playerId"),
    }),
  );
});

let initialized = false;

websocket.addEventListener("message", (event) => {
  console.debug("message incomming");
  const data = JSON.parse(event.data);

  if (!initialized) {
    console.debug(data);
    return;
  }

  switch (data.type) {
    case "start":
      return start();
    case "update":
      return update(data);
    default:
      console.debug(data);
  }
});

function ready() {
  initialized = true;
}

function initializeGame() {
  /*
    const main = document.currentScript.previousElementSibling;

    main.addEventListener('click', ({target}) => {
        document.querySelectorAll('button.selected').forEach(button => button.classList.remove('selected'));
        target.classList.add('selected');
    })
    */
}

function initializeCountDown() {
  const h1 = document.currentScript.previousElementSibling;
  const countDown = document.currentScript.parentElement;

  let count = 9;
  countDown.classList.add("started");
  const interval = setInterval(() => {
    count--;
    if (count === -1) {
      clearInterval(interval);
      countDown.dispatchEvent(new CustomEvent("countDownEnd"));
      countDown.remove();
      return;
    }
    h1.innerHTML = count;
  }, 1000);
}

document.addEventListener("DOMContentLoaded", ready);
