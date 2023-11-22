import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

export async function onRequest() {
  const randomName = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals], // arreglos de palabras
    style: "lowerCase", // todas las palabras en minúsculas
    separator: "-", // separador entre palabras
  });
  return new Response(randomName);
}
