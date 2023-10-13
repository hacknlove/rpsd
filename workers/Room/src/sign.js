export async function signData(salt, data) {
	const keyBuffer = new TextEncoder().encode(salt);
	const jsonBuffer = new TextEncoder().encode(JSON.stringify(data));

	const key = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

	const signature = await crypto.subtle.sign('HMAC', key, jsonBuffer);

	return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function signSearchParams(salt, searchParams) {
	const string = searchParams.toString();
	const signature = await signData(salt, string);

	searchParams.append('_s', signature);
}

export async function verifyData(salt, data, signature) {
	const actualSignature = await signData(salt, data);

	return signature === actualSignature;
}

export async function verifySearchParams(salt, searchParams) {
	const signature = searchParams.get('_s');
	searchParams.delete('_s');

	const string = searchParams.toString();
	searchParams.append('_s', signature);

	return verifyData(salt, string, signature);
}
