import "./PlayRpsd.scss";
import { websocket } from "@/js/connectWS";

export function PlayRpsd(params) {
  function play(event) {
    websocket.send(
      JSON.stringify({
        type: "play",
        option: event.target.id,
      }),
    );
  }

  return (
    <main id="play-rpsd">
      <button onClick={play} id="rock">
        <span class="emoji">🪨</span> Rock
      </button>
      <button onClick={play} id="paper">
        <span class="emoji">📜</span> Paper
      </button>
      <button onClick={play} id="scissors">
        <span class="emoji">✂️</span> Scissors
      </button>
      <button onClick={play} id="duck">
        <span class="emoji">🦆</span> Duck
      </button>
    </main>
  );
}
