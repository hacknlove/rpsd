import { verifySearchParams } from 'lib/sign';
import { signSearchParams } from './sign';
import Game from '@/pages/game.astro';

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

const options = new Set(['rock', 'paper', 'scissors', 'duck']);

const gameMap = {
	rock: 'scissors',
	paper: 'rock',
	scissors: 'paper',
};

export class Room extends Game{
	constructor(state, env) {
		super(state, env);
	}

	async update_({ count = false, loser } = {}) {
		const state = await this.storage.get(['status', 'nextAt']);

		const data = {
			type: 'update',
			totalPlayers,
			status: state.get('status'),
			nextAt: state.get('nextAt'),
		};

		if (count) {
			count = await this.storage.get(['rock', 'paper', 'scissors', 'duck']);
			data.rock = count.get('rock');
			data.paper = count.get('paper');
			data.scissors = count.get('scissors');
			data.duck = count.get('duck');
		}

		if (loser) {
			data.loser = loser;
		}

		return this.update(data);
	}

	// Connection

	async newPlayer(playerId) {
		return {
			
		}
	}

	async wsPlayer(playerId) {
		super.wsPlayer(playerId, async () => {

		});

		const currentOption = await this.storage.get(key);
		console.log(2);
		const startsAt = await this.storage.get('startsAt');
		if (startsAt < Date.now() && !currentOption) {
			return sendRestJSON({
				error: 'The Game has started. No new players allowed',
			});
		}

		console.log(3);

		if (!currentOption) {
			await this.storage.put({
				[key]: 'duck',
				duck: (await this.storage.get('duck')) + 1,
			});
		}

		return this.wsConnect(
			{
				isPlayer: true,
				playerId,
			},
			[playerId, 'player'],
		);
	}

	async ws(request) {
		const url = new URL(request.url);

		if (url.searchParams.get('id') !== this.id) {
			return sendRestJSON({
				error: 'Wrong id',
			});
		}

		const password = url.searchParams.get('password');

		if (password) {
			return this.wsAdmin(password);
		}

		const playerId = url.searchParams.get('playerId');
		if (playerId) {
			return this.wsPlayer(playerId);
		}
		return sendRestJSON({
			error: 'Missing password or playerId',
		});
	}

	async clientSideAlarm(wsData) {
		const data = await this.storage.get(['status', 'nextAt']);

		if (wsData.status !== data.get('status') || wsData.nextAt !== data.get('nextAt')) {
			return;
		}

		return this.alarm();
	}

	async alarmStartGame() {
		this.state = 'playing';
		this.nextAt = Date.now() + 1000 * 60;
		this.update();
	}

	async alarmPlay() {
		const nextAt = Date.now() + 1000 * 60;
		await this.storage.put({
			status: 'playing',
			nextAt,
		});

		const optionsCount = await this.storage.get(['rock', 'paper', 'scissors']);

		const ducks = await this.storage.get('duck');

		const optionsArray = Object.entries(optionsCount);
		optionsArray.sort((a, b) => b[1] - a[1]);

		if (ducks > optionsArray[0][1]) {
			await this.setLoser('duck');
			return this.update({ count: true, loser: 'duck' });
		}
		if (optionsArray[0][1] === optionsArray[1][1] && optionsArray[1][1] === optionsArray[2][1]) {
			return this.update({ count: true, loser: 'draw' });
		}
		if (optionsArray[1][1] !== optionsArray[2][1]) {
			await this.setLoser(optionsArray[2][0]);
			return this.update({ count: true, loser: optionsArray[2][0] });
		}

		if (gameMap[optionsArray[1][0]] === optionsArray[2][0]) {
			await this.setLoser(optionsArray[1][0]);
			return this.update({ count: true, loser: optionsArray[1][0] });
		}

		await this.setLoser(optionsArray[2][0]);
		return this.update({ count: true, loser: optionsArray[2][0] });
	}

	async setLoser(loser) {
		const allPlayers = this.state.getWebSockets('player');

		for (const player of allPlayers) {
			const attachment = player.deserializeAttachment();

			if (attachment.option === loser) {
				attachment.loser = true;
				player.serializeAttachment(attachment);
				player.send(JSON.stringify({ type: 'loser' }));
			}
		}
	}

	async alarm() {
		try {
			const webSockets = this.state.getWebSockets();
			if (webSockets.length === 0) {
				console.info('No players');
				this.storage.deleteAll();
				return;
			}

			const status = await this.storage.get('status');

			switch (status) {
				case 'waiting':
					return this.alarmStartGame();

				case 'playing': {
					console.info('Waiting');
					const nextAt = Date.now() + 1000 * 60;
					await this.storage.put({
						status: 'playing',
						nextAt,
					});
					this.update();
					setTimeout(async () => {
						await this.storage.setAlarm(nextAt);
					}, 1);
					break;
				}
				default: {
					console.log({ status });
					return;
				}
			}
		} catch (error) {
			console.error(error);
		}
	}

	async webSocketClose(ws) {
		const attachment = ws.deserializeAttachment();

		if (attachment.isAdmin) {
			return;
		}

		const playerId = attachment.playerId;

		const option = await this.storage.get(`option_${playerId}`);

		if (!option) {
			return this.update({ closing: true });
		}

		this.state.blockConcurrencyWhile(async () => {
			await this.storage.delete(`option_${playerId}`);
			await this.storage.put({
				[option]: (await this.storage.get(option)) - 1,
			});
		});

		this.update({ closing: true });
	}

	async webSocketError(ws, error) {
		console.error(error);
		return this.webSocketClose(ws);
	}

	async play(playerId, option) {
		if (!options.has(option)) {
			return;
		}
		const key = `option_${playerId}`;
		const currentOption = await this.storage.get(key);

		if (!currentOption || option === currentOption) {
			return;
		}

		this.state.blockConcurrencyWhile(async () => {
			this.storage.put(key, option);
			await new Promise.all([
				async () => option !== 'duck' && this.storage.put(option, (await this.storage.get(option)) + 1),
				async () => currentOption !== 'duck' && this.storage.put(currentOption, (await this.storage.get(currentOption)) - 1),
			]);
		});

		const websockets = this.state.getWebSockets(playerId);

		websockets.forEach((ws) => {
			const attachment = ws.deserializeAttachment();

			attachment.option = option;

			ws.serializeAttachment(attachment);

			ws.send(
				JSON.stringify({
					type: 'play',
					option,
				}),
			);
		});
	}

	async webSocketMessage(ws, msg) {
		const data = JSON.parse(msg);

		const wsData = ws.deserializeAttachment();

		switch (data.type) {
			case 'play':
				if (!wsData.isPlayer) {
					return;
				}
				this.play(wsData.playerId, data.option);
				break;
			case 'clientSideAlarm':
				if (!wsData.isAdmin) {
					return;
				}
				await this.clientSideAlarm(data);
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
		const data = await this.storage.get(['status', 'nextAt', 'startsAt']);

		if (data.get('startsAt') < Date.now() && !this.state.getWebSockets('player').length) {
			await data.set('status', 'ended');
		}

		switch (data.get('status')) {
			case 'playing':
			case 'waiting':
				return this.loginAdmin(request, 'The name is being used and the password is wrong');
			case 'ended':
			default:
				await this.storage.deleteAll();
		}

		const { name, game, nextAt, password } = await request.json();

		const nextAtms = new Date(nextAt).getTime();

		await this.storage.put({
			name,
			game,
			status: 'waiting',
			password,
			nextAt: nextAtms,
			startsAt: nextAtms,
		});

		await this.storage.setAlarm(nextAtms);

		return sendRestJSON({
			id: this.id,
		});
	}

	async isAdmin(request) {
		const password = await this.storage.get('password', {
			allowConcurrency: true,
			noCache: true,
		});
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
		const nextAt = await this.storage.get('nextAt');
		if (nextAt > Date.now()) {
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

		const playerId = await crypto.randomUUID();

		this.storage.put(`player_${playerId}`, {
			status: 'playing',
			option: 'duck',
		});

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

	/**
	 * method to handle the request received by the Durable Object.
	 * https://developers.cloudflare.com/durable-objects/get-started/
	 *
	 * @param {Request} request - The request to be processed.
	 * @return {Promise<Response>} The response generated based on the request.
	 */
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
				case '?/joinOpen': {
					return await this.joinOpen(request);
				}
				default:
					return sendRestJSON({
						error: 'Not found',
					});
			}
		} catch (error) {
			console.error(error);
			return sendRestJSON({
				status: 500,
				error: error.message,
			});
		}
	}
}
