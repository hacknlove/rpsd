export async function signText(salt, text) {
  const keyBuffer = new TextEncoder().encode(salt);
  const jsonBuffer = new TextEncoder().encode(text);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, jsonBuffer);

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
export async function verifyText(salt, text, signature) {
  const actualSignature = await signText(salt, text);

  return signature === actualSignature;
}

export async function signData(salt, data) {
  return signText(salt, JSON.stringify(data));
}
export async function verifyData(salt, data, signature) {
  return verifyText(salt, JSON.stringify(data), signature);
}

export async function signSearchParams(salt, searchParams) {
  const string = searchParams.toString();
  const signature = await signText(salt, string);

  searchParams.append("_s", signature);
}
export async function verifySearchParams(salt, searchParams) {
  const signature = searchParams.get("_s");
  searchParams.delete("_s");

  const string = searchParams.toString();
  searchParams.append("_s", signature);

  return verifyText(salt, string, signature);
}
