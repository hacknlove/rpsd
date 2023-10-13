import { verifySearchParams } from 'lib/sign';
import { signSearchParams } from './sign';
import { z } from 'zod';

export default {
	async fetch() {
		return new Response(null, { status: 404 });
	},
};

function sendRestJSON(data) {
	return new Response(JSON.stringify(data), {
		headers: {
			'content-type': 'application/json',
		},
	});
}

export class Room {
	constructor(state, env) {
		this.state = state;
		this.storage = state.storage;
		this.env = env;
		this.id = state.id;

		this.controlers = new Set();
	}

	async ws() {
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair();

		this.state.acceptWebSocket(serverWebSocket);

		return new Response(null, { status: 101, webSocket: clientWebSocket });
	}

	alarm() {
		this.state.getWebSockets().forEach((ws) => {
			ws.send('Game is starting');
		});
	}

	async webSocketClose(ws) {
		ws;
	}

	async webSocketError(ws) {
		ws;
	}

	async webSocketMessage(ws, msg) {
		const data = JSON.parse(msg);

		switch (data.type) {
			case 'play':
				break;
			default:
				console.log(data);
		}
	}

	async newMatch(request) {
		let startsAt = await this.storage.get('startsAt');
		if (startsAt) {
			if (startsAt > Date.now() || this.state.getWebSockets().size > 0) {
				return sendRestJSON({
					error: 'The name is currently in use',
				});
			}

			await this.storage.deleteAll();
		}

		const token = crypto.randomUUID();
		await this.storage.put('token', token);

		const json = await request.json();

		const name = z.string().parse(json.name);
		const game = z.string().parse(json.game);

		startsAt = new Date(
			z
				.string()
				.datetime()
				.parse(json.startsAt + 'Z'),
		).getTime();

		await this.storage.put({
			name,
			game,
			startsAt,
		});

		this.storage.setAlarm(new Date(startsAt).getTime());

		return sendRestJSON({
			token,
		});
	}

	async getOpenLink(request) {
		const token = await this.storage.get('token');
		const data = await request.json();

		if (token !== data.token) {
			return sendRestJSON({
				error: 'Wrong token',
			});
		}

		const search = new URLSearchParams(data);
		search.delete('token');

		await signSearchParams(token, search);

		return sendRestJSON({
			search: search.toString(),
		});
	}

	async joinOpen(request) {
		const startsAt = await this.storage.get('startsAt');
		if (startsAt > Date.now()) {
			return sendRestJSON({
				error: 'The Game has started',
			});
		}

		const token = await this.storage.get('token');

		if (await verifySearchParams(token, new URLSearchParams(request.url))) {
			return sendRestJSON({
				error: 'Wrong signature',
			});
		}

		const playerId = `player_${await crypto.randomUUID()}`;

		this.storage.put(playerId, 'playing');

		const search = new URLSearchParams({
			playerId,
			name: await this.storage.get('name'),
			game: await this.storage.get('game'),
		});

		await signSearchParams(token, search);

		return sendRestJSON({
			search: search.toString(),
		});
	}

	async fetch(request) {
		const url = new URL(request.url);

		try {
			switch (url.pathname) {
				case '/newMatch':
					return await this.newMatch(request);
				case '/ws':
					return await this.ws();
				case '/getOpenLink': {
					return await this.getOpenLink(request);
				}
				case '/joinOpen': {
					return await this.joinOpen(request);
				}
				default:
					return await new Response(null, { status: 404 });
			}
		} catch (error) {
			if (error.issues) {
				console.log(JSON.stringify(error.issues, null, 2));
				return sendRestJSON({
					status: 400,
					error: error.issues.map((issue) => issue.message).join(', '),
				});
			}
			return sendRestJSON({
				status: 500,
				error: error.message,
			});
		}
	}
}
