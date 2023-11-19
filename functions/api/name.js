import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

const randomName = uniqueNamesGenerator({
  dictionaries: [adjectives, colors, animals], // arreglos de palabras
  style: "lowerCase", // todas las palabras en minúsculas
  separator: "-", // separador entre palabras
});

export async function onRequest() {
  return new Response(randomName);
}
