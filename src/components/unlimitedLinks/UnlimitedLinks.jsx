import { fetchRest } from "@/js/fetchRest";

async function copyPlayerLink() {
  const link = await fetchRest("getOpenLink", {});

  if (link.error) {
    alert("An error occurred while generating the link");
    return;
  }

  const playerLink = new URL("/join", location);

  playerLink.search = link.search;

  await navigator.clipboard.writeText(playerLink.toString());

  alert("Copied link to clipboard");
}

export function UnlimitedLinks() {
  return <button onClick={copyPlayerLink}>Copy Player Link</button>;
}
