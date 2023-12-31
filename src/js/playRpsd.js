function update(data) {
  if (!initialized) {
    console.debug(data);
    return;
  }

  switch (data.status) {
    case "playing":
      // handle when the status is playing
      break;
    case "waiting":
      // handle when the status is waiting
      break;
    case "reserved":
      // handle when the status is reserved
      break;
    case "ended":
      // handle when the status is ended
      break;
    default:
      console.debug(data);
      break;
  }
}
import { websocket } from "./connectWS";

function start() {
  initializeGame();
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

document.addEventListener("DOMContentLoaded", ready);
