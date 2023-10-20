import { verifySearchParams } from 'lib/sign';
import { signSearchParams } from './sign';

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

	async update({ closing = false } = {}) {
		let totalPlayers = this.state.getWebSockets('players').length;

		if (closing) {
			totalPlayers -= 1;
		}

		const everyone = this.state.getWebSockets();

		const data = JSON.stringify({
			type: 'update',
			totalPlayers,
			status: await this.storage.get('status'),
			startsAt: await this.storage.get('startsAt'),
		});

		everyone.forEach((ws) => {
			ws.send(data);
		});
	}

	async ws(request) {
		const tags = [];
		const url = new URL(request.url);

		if (url.searchParams.get('id') !== this.id) {
			return sendRestJSON({
				error: 'Wrong id',
			});
		}
		const password = url.searchParams.get('password');

		const playerId = url.searchParams.get('playerId');

		if (password) {
			tags.push('admin');
			tags.push(password);
			if (password !== (await this.storage.get('password'))) {
				return sendRestJSON({
					error: 'Wrong password',
				});
			}
		} else if (playerId) {
			tags.push('players');
			tags.push(playerId);
		} else {
			return sendRestJSON({
				error: 'Missing password or playerId',
			});
		}

		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair();

		serverWebSocket.serializeAttachment({
			playerId,
			isPlayer: Boolean(playerId),
			isAdmin: Boolean(password),
		});
		this.state.acceptWebSocket(serverWebSocket, tags);

		this.update();

		return new Response(null, { status: 101, webSocket: clientWebSocket });
	}

	alarm() {
		this.state.getWebSockets().forEach((ws) => {
			ws.send('Game is starting');
		});
	}

	async webSocketClose(ws) {
		this.update({ closing: true });
		ws;
	}

	async webSocketError(ws, error) {
		this.update({ closing: true });
		ws;
		console.error(error);
	}

	async webSocketMessage(ws, msg) {
		const data = JSON.parse(msg);

		console.debug(ws.tags);

		switch (data.type) {
			case 'play':
				break;
			default:
				console.debug(data);
		}
	}

	async loginAdmin(request, error) {
		const password = await this.storage.get('password');

		const data = await request.json();

		if (password !== data.password) {
			return sendRestJSON({
				error,
			});
		}

		return sendRestJSON({
			id: this.id,
		});
	}
	async newMatch(request) {
		const status = await this.storage.get('status');
		switch (status) {
			case 'playing':
			case 'waiting':
				return this.loginAdmin(request, 'The name is being used and the password is wrong');
			case 'reserved':
				return this.loginAdmin(request, 'The name is reserved and the password is wrong');
			case 'ended':
			default:
				await this.storage.deleteAll();
		}

		const { name, game, startsAt, password } = await request.json();

		const startsAtms = new Date(startsAt).getTime();

		await this.storage.put({
			name,
			game,
			status: 'waiting',
			password,
			startsAt: startsAtms,
		});

		this.storage.setAlarm(startsAtms);

		return sendRestJSON({
			id: this.id,
		});
	}

	async isAdmin(request) {
		const password = await this.storage.get('password');
		const data = await request.json();

		if (password !== data.password || this.id !== data.id) {
			return sendRestJSON({
				error: 'Wrong password',
			});
		}

		return sendRestJSON({});
	}

	async isAvailable(request) {
		const data = await request.json();

		if (data.id !== this.id) {
			return sendRestJSON({
				error: 'Wrong id',
			});
		}

		const status = await this.storage.get('status');

		if (status === 'playing') {
			return sendRestJSON({
				error: 'The Game has already started',
			});
		}

		if (status !== 'waiting') {
			return sendRestJSON({
				error: 'The Game is not available',
			});
		}

		return sendRestJSON({});
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
					return await this.ws(request);
				case '/isAdmin': {
					return await this.isAdmin(request);
				}
				case '/joinOpen': {
					return await this.joinOpen(request);
				}
				default:
					return sendRestJSON({
						error: 'Not found',
					});
			}
		} catch (error) {
			if (error.issues) {
				console.error(JSON.stringify(error.issues, null, 2));
				return sendRestJSON({
					status: 400,
					error: error.issues.map((issue) => issue.message).join(', '),
				});
			}
			console.error(error);
			return sendRestJSON({
				status: 500,
				error: error.message,
			});
		}
	}
}
