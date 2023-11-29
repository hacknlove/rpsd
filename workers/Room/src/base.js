export class Game {
	constructor(state, env, keys) {
		this.storage = state.storage;
		this.state = state;
		this.env = env;
		this.id = state.id;

		// Alarm is buggy, we are disabling it and relying on the admin client
		this.storage.setAlarm = () => {};

		this._playerCount = 0;
		this.players = new Map();

		this.storage.get(['playerCount', 'players', ...keys]).then((map) => {
			map.forEach((value, key) => {
				if (value !== undefined) {
					this[`_${key}`] = value;
				}
			});
		});
	}

	//region Entrypoints

	/**
	 * Handles incoming requests and routes them to corresponding methods
	 * based on the URL pathname.
	 *
	 * @param {Request} request - The incoming request object.
	 * @returns {Response} - The response to the request.
	 */
	async fetch(request) {
		const url = new URL(request.url);

		try {
			switch (url.pathname) {
				case '/newMatch':
					// Called from '/api/newMatch' when a new match is created
					return await this.newMatch(request);
				case '/ws':
					// Called from '/api/ws' when a new player or admin connects
					return await this.ws(request);
				case '/isAdmin': {
					// called by '/api/getOpenLink" to check if the requester is admin
					return await this.isAdmin(request);
				}
				default:
					// any other operation is not allowed
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

	async webSocketMessage(ws, msg) {
		const data = JSON.parse(msg);

		const wsData = ws.deserializeAttachment();

		switch (data.type) {
			case 'play':
				if (!wsData.isPlayer) {
					return;
				}
				this.play(wsData.playerId, data);
				break;
			case 'nextTurn':
				if (this.canCallNextTurn({ wsData, data })) {
					this.nextTurn({ wsData, data });
				}
				break;

			default:
				console.debug(data);
		}
	}

	/**
	 * Create a new match.
	 *
	 * @param {Object} request - The request object.
	 * @returns {Promise} - A promise that resolves to the response object.
	 */
	async newMatch({ name, password }) {
		this.storage.put({
			name,
			password,
		});

		// Return the id of the match
		return this.sendRestJSON({
			id: this.id,
		});
	}

	/**
	 * Asynchronously handles a WebSocket request.
	 *
	 * @param {Request} request - The request object representing the WebSocket request.
	 * @return {Promise} A promise that resolves to a response or an error.
	 */
	async ws(request) {
		const url = new URL(request.url);

		if (url.searchParams.get('id') !== this.id) {
			return this.sendRestJSON({
				error: 'Wrong id',
			});
		}

		const playerId = url.searchParams.get('playerId');
		if (playerId) {
			return this.wsPlayer(playerId);
		}

		const password = url.searchParams.get('password');

		if (password) {
			return this.wsAdmin(password);
		}

		return this.sendRestJSON({
			error: 'Missing password or playerId',
		});
	}

	/**
	 * Check if the user making the request is an admin.
	 *
	 * @param {Object} request - The request object.
	 * @returns {Promise<Object>} - A Promise that resolves with an empty object if the user is an admin, or with an error object if the user is not an admin.
	 */
	async isAdmin(request) {
		// Get the admin password from storage
		const password = await this.storage.get('password', {
			allowConcurrency: true,
			noCache: true,
		});

		// Parse the request body
		const data = await request.json();

		// Check if the password and id in the request data match the stored password and the admin's id
		if (password !== data.password || this.id !== data.id) {
			// Return an error response if the password or id is incorrect
			return this.sendRestJSON({
				error: 'Wrong password',
			});
		}

		// Return an empty object if the user is an admin
		return this.sendRestJSON({});
	}

	/**
	 * Closes a WebSocket connection and performs necessary cleanup if the attached player disconnects.
	 * @param {WebSocket} ws - The WebSocket connection to close.
	 */
	async webSocketClose(ws) {
		try {
			// Deserialize the attachment from the WebSocket
			const attachment = ws.deserializeAttachment();

			// If the attachment is not a player, return
			if (!attachment.isPlayer) {
				return;
			}

			// Get the player ID from the attachment
			const playerId = attachment.playerId;

			// Get the player object from the player ID
			const player = this.players.get(playerId);

			// If the player does not exist, return
			if (!player) {
				return;
			}

			// Get all the WebSocket connections for the player
			const websockets = this.state.getWebSockets(playerId);

			// If there are more than one WebSocket connections, return
			if (websockets.length > 1) {
				return;
			}

			// If the WebSocket connection is not the first in the list, return
			if (websockets[0] !== ws) {
				return;
			}

			// Delete the player from the game
			this.deletePlayer(player, playerId);

			// Remove the player from the players map
			this.players.delete(playerId);

			// Save the updated players map in the storage
			this.storage.put('players', this.players);

			// Decrease the player count
			this.decPlayerCount();

			// Update the game state
			this.update();
		} catch (error) {
			console.error(error);
		}
	}

	//endregion

	/* START ADMIN STUFF */

	/**
	 * Check if the provided password is correct and connect to the admin WebSocket.
	 * @param {string} password - The password to authenticate as admin.
	 * @returns {Promise<object>} - The result of connecting to the admin WebSocket.
	 */
	async wsAdmin(password) {
		// Check if the provided password is correct
		if (password !== (await this.storage.get('password'))) {
			// Return an error message if the password is incorrect
			return this.sendRestJSON({ error: 'Wrong password' });
		}

		// Connect to the admin WebSocket with the provided password
		return this.wsConnect({ isAdmin: true }, [`password_${password}`, 'admin']);
	}

	/* END ADMIN STUFF*/

	// General

	//region Player

	/**
	 * This function handles the WebSocket connection for a player.
	 * It checks if the player exists and if the game has already started.
	 * If the game has started, new players are not allowed to join.
	 * If the player does not exist, it adds the player to the game.
	 * Finally, it establishes the WebSocket connection for the player.
	 *
	 * @param {string} playerId - The ID of the player
	 * @returns {Promise} - A promise that resolves to the WebSocket connection for the player
	 */
	async wsPlayer(playerId) {
		// Check if the player exists
		const existsPlayer = await this.existsPlayer(playerId);

		// If the game has started and the player does not exist, return an error
		if (!existsPlayer && !this.canJoin(playerId)) {
			return this.sendRestJSON({
				error: 'The Game has started. No new players allowed',
			});
		}

		// If the player does not exist, add the player to the game
		if (!existsPlayer) {
			await this.addPlayer(playerId, this.newPlayer());
		}

		// Establish the WebSocket connection for the player

		return this.wsConnect(
			{
				isPlayer: true,
				playerId,
			},
			[playerId, 'player'],
		);
	}

	//endregion

	// Internal

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
			try {
				ws.send(json);
			} catch (e) {
				console.error(e);
			}
		});
	}

	get playerCount() {
		return this._playerCount;
	}

	incPlayerCount() {
		this._playerCount++;
		this.storage.put('playerCount', this._playerCount);
		console.log('playerCount', this.playerCount);
	}

	decPlayerCount() {
		this._playerCount--;
		this.storage.put('playerCount', this._playerCount);
		console.log('playerCount', this.playerCount);
	}

	reset() {
		this._playerCount = 0;
		this.players = new Map();
		this.storage.put('players', this.players);
	}

	async existsPlayer(playerId) {
		return this.players.has(playerId);
	}

	async addPlayer(playerId, player) {
		this.players.set(playerId, player);
		this.storage.put('players', this.players);
		this.incPlayerCount();
	}

	async getPlayer(playerId) {
		const players = await this.storage.get('players');
		return players.get(playerId);
	}

	async createPlayer(playerId) {
		playerId;
	}

	async wsConnect(attachment, tags) {
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair();

		serverWebSocket.serializeAttachment(attachment);
		this.state.acceptWebSocket(serverWebSocket, tags);

		this.update();

		return new Response(null, { status: 101, webSocket: clientWebSocket });
	}

	async loginAdmin(request, error) {
		const password = await this.storage.get('password');

		const data = await request.json();

		if (password !== data.password) {
			return this.sendRestJSON({
				error,
			});
		}

		return this.sendRestJSON({
			id: this.id,
		});
	}
}
