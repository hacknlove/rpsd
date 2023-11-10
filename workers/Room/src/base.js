export class Game {
    constructor(state, env) {
		this.state = state;
		this.storage = state.storage;
		this.env = env;
		this.id = state.id;

		// Alarm is buggy, we are disabling it and relying on the admin client
		this.storage.setAlarm = () => {};

        this._playerCount = 0;
        this._startAt = 0;
        this._nextAt = 0;
        this._state = 'waiting';
        this.players = new Map();

        this.storage.get([
            'playerCount',
            'startsAt',
            'nextAt',
            'state',
            'players',
        ]).then((map) => {
            map.forEach((value, key) => {
                if (value !== undefined) {
                    this[`_${key}`] = value;
                }
            })
        });

	}

    async update(data = {}, tag) {
        const everyone = this.state.getWebSockets(tag);
		const json = JSON.stringify({
            type: 'update',
            playerCount: this.playerCount,
            nextAt: this.nextAt,
            ...data
        });
		everyone.forEach((ws) => {
			ws.send(json);
		});
    }

    get playerCount() {
        return this._playerCount
    }

    incPlayerCount() {
        this._playerCount++
        this.storage.put('playerCount', this._playerCount)
    }

    decPlayerCount() {
        this._playerCount--
        this.storage.put('playerCount', this._playerCount)
    }

    get startsAt () {
        return this._startsAt
    }

    get nextAt() {
        return this._nextAt
    }
    set nextAt(nextAt) {
        this._nextAt = nextAt
        this.storage.put('nextAt', nextAt)
    }
    get state() {
        return this._state
    }
    set state(state) {
        this._state = state
        this.storage.put('state', state)
    }

    async wsAdmin(password) {
		if (password !== (await this.storage.get('password'))) {
			return sendRestJSON({
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

    async existsPlayer (playerId) {
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
        
    }

    async wsPlayer(playerId) {
        const existsPlayer = await this.existsPlayer(playerId);

		if (this.state !== 'waitin' && !existsPlayer) {
			return sendRestJSON({
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

}