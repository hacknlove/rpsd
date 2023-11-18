export class Game {
	constructor(state, env) {
		this.storage = state.storage;
		this.state = state;
		this.env = env;
		this.id = state.id;

		// Alarm is buggy, we are disabling it and relying on the admin client
		this.storage.setAlarm = () => {};

		this._playerCount = 0;
		this._startAt = Number.MAX_SAFE_INTEGER;
		this._nextAt = Number.MAX_SAFE_INTEGER;
		this._status = 'none';
		this.players = new Map();

		this.storage.get(['playerCount', 'startsAt', 'nextAt', 'status', 'players']).then((map) => {
			map.forEach((value, key) => {
				if (value !== undefined) {
					this[`_${key}`] = value;
				}
			});
		});
	}

	sendRestJSON(data) {
		return new Response(JSON.stringify(data), {
			headers: {
				'content-type': 'application/json',
			},
		});
	}

	async update(data = {}, tag) {
		const everyone = this.state.getWebSockets(tag);
		const json = JSON.stringify({
			type: 'update',
			playerCount: this.playerCount,
			nextAt: this.nextAt,
			...data,
		});
		everyone.forEach((ws) => {
			ws.send(json);
		});
	}

	get playerCount() {
		return this._playerCount;
	}

	incPlayerCount() {
		this._playerCount++;
		this.storage.put('playerCount', this._playerCount);
	}

	decPlayerCount() {
		this._playerCount--;
		this.storage.put('playerCount', this._playerCount);
	}

	get startsAt() {
		return this._startsAt;
	}

	get nextAt() {
		return this._nextAt;
	}
	set nextAt(nextAt) {
		this._nextAt = nextAt;
		this.storage.put('nextAt', nextAt);
	}
	get status() {
		return this._status;
	}
	set status(status) {
		this._status = status;
		this.storage.put('status', status);
	}

	reset() {
		this.playerCount = 0;
		this.state = 'none';
		this.players = new Map();
		this.storage.put('players', this.players());
		this.startsAt = Number.MAX_SAFE_INTEGER;
	}

	async wsAdmin(password) {
		if (password !== (await this.storage.get('password'))) {
			return this.sendRestJSON({
				error: 'Wrong password',
			});
		}
		return this.wsConnect(
			{
				isAdmin: true,
			},
			[`password_${password}`, 'admin'],
		);
	}

	async existsPlayer(playerId) {
		const players = await this.storage.get('players');
		return players.has(playerId);
	}

	async addPlayer(playerId, player) {
		const players = await this.storage.get('players');
		players.set(playerId, player);
		this.storage.put('players', players);
	}

	async getPlayer(playerId) {
		const players = await this.storage.get('players');
		return players.get(playerId);
	}

	async createPlayer(playerId) {
		playerId;
	}

	async wsPlayer(playerId) {
		const existsPlayer = await this.existsPlayer(playerId);

		if (this.state !== 'waitin' && !existsPlayer) {
			return this.sendRestJSON({
				error: 'The Game has started. No new players allowed',
			});
		}

		if (!existsPlayer) {
			await this.addPlayer(playerId, this.newPlayer());
		}

		return this.wsConnect(
			{
				isPlayer: true,
				playerId,
			},
			[playerId, 'player'],
		);
	}

	async wsConnect(attachment, tags) {
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair();

		serverWebSocket.serializeAttachment(attachment);
		this.state.acceptWebSocket(serverWebSocket, tags);

		this.incPlayerCount();

		this.update();

		return new Response(null, { status: 101, webSocket: clientWebSocket });
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
				default:
					return this.sendRestJSON({
						error: 'Not found',
					});
			}
		} catch (error) {
			console.error(error);
			return this.sendRestJSON({
				status: 500,
				error: error.message,
			});
		}
	}

	async newMatch(request) {
		if (this.startsAt < Date.now() && this.playerCount === 0) {
			this.state = 'ended';
		}

		switch (this.state) {
			case 'playing':
			case 'waiting':
				return this.loginAdmin(request, 'The name is being used and the password is wrong');
			case 'ended':
			case 'none':
			default:
				await this.storage.deleteAll();
		}

		const { name, nextAt, password } = await request.json();

		const nextAtms = new Date(nextAt).getTime();

		await this.storage.put({
			name,
			status: 'waiting',
			password,
			nextAt: nextAtms,
			startsAt: nextAtms,
		});

		await this.storage.setAlarm(nextAtms);

		return this.sendRestJSON({
			id: this.id,
		});
	}
}
