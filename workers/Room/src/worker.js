import { Game } from './base';

export default {
	async fetch() {
		return new Response(null, { status: 404 });
	},
};

const options = new Set(['rock', 'paper', 'scissors', 'duck']);

const gameMap = {
	rock: 'scissors',
	paper: 'rock',
	scissors: 'paper',
};

export class Room extends Game {
	constructor(state, env) {
		super(state, env, ['rock', 'paper', 'scissors', 'duck', 'startAt', 'nextAt', 'status', 'ducks', 'rocks', 'papers', 'scissors']);

		this._duck ??= 0;
		this._rock ??= 0;
		this._paper ??= 0;
		this._scissors ??= 0;
		this._startAt ??= Number.MAX_SAFE_INTEGER;
		this._nextAt ??= Number.MAX_SAFE_INTEGER;
		this._status ??= 'none';

		this.ducks ??= new Set();
		this.rocks ??= new Set();
		this.papers ??= new Set();
		this.scissors ??= new Set();
	}

	reset() {
		super.reset();
		this.startsAt = Number.MAX_SAFE_INTEGER;
		this.status = 'none';
	}

	get duck() {
		return this._duck;
	}

	get rock() {
		return this._rock;
	}

	get paper() {
		return this._paper;
	}

	get scissors() {
		return this._scissors;
	}

	set duck(value) {
		this._duck = value;
		this.storage.put('duck', value);
	}

	set rock(value) {
		this._rock = value;
		this.storage.put('rock', value);
	}

	set paper(value) {
		this._paper = value;
		this.storage.put('paper', value);
	}

	set scissors(value) {
		this._scissors = value;
		this.storage.put('scissors', value);
	}

	get startsAt() {
		return this._startsAt;
	}
	set startsAt(startsAt) {
		this._startsAt = startsAt;
		this._nextAt = startsAt;
		this.storage.put({
			startsAt,
			nextAt: startsAt,
		});
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

	async newPlayer() {
		this.duck += 1;
		return {
			option: 'duck',
		};
	}

	async deletePlayer(player) {
		const option = player.option;

		this[option] -= 1;
	}

	canCallNextTurn({ wsData, data }) {
		return wsData.isAdmin && data.status === this.status && data.nextAt === this.nextAt;
	}


	async nextTurn({ wsData, data }) {
		switch (this.status) {
			case 'waiting': {
				this.status = 'playing';
				this.nextAt = Date.now() + 1000 * 10;
				this.update();
				return;
			}
			case 'playing': {
				this.playTurn()
			}
		}
	}

	async webSocketError(ws, error) {
		console.error(error);
		return this.webSocketClose(ws);
	}

	async play(playerId, data) {
		const player = await this.getPlayer(playerId);

		if (!player) {
			return;
		}

		if (!options.has(data.option)) {
			return;
		}

		if (player.option === data.option) {
			return;
		}

		if (this.player.option) {
			this[this.player.option]--
		}

		this.player.option = data.option;
		this[data.option] += 1;

		const websockets = this.state.getWebSockets(playerId);

		if (websockets.length <=2) {
			return;
		}

		websockets.forEach((ws) => {
			ws.send(
				JSON.stringify({
					type: 'play',
					option,
				}),
			);
		});
	}

	async isAvailable(request) {
		const data = await request.json();

		if (data.id !== this.id) {
			return this.sendRestJSON({
				error: 'Wrong id',
			});
		}

		const status = await this.storage.get('status');

		if (status === 'playing') {
			return this.sendRestJSON({
				error: 'The Game has already started',
			});
		}

		if (status !== 'waiting') {
			return this.sendRestJSON({
				error: 'The Game is not available',
			});
		}

		return this.sendRestJSON({});
	}

	async playTurn() {
		this.nextAt = Date.now() + 1000 * 10;

		const optionsArray = [
			[ 'rock', this.rock ],
			[ 'paper', this.paper ],
			[ 'scissors', this.scissors ],
		];

		optionsArray.sort((a, b) => b[1] - a[1]);

		

		if (this.ducks > optionsArray[0][1]) {
			this.setLoser('duck');
		}

		switch (true) {
			case this.rock === this.paper && this.paper === this.scissors:
				// triple tie. No one loses.
				break;
			case optionsArray[1][1] === optionsArray[2][1]:
				// tie at the bottom, follows rock, paper, scissors rules.
				this.setLoser(gameMap[optionsArray[1][0]]);
				break;
			default:
				// No tie. Loses the fewest.
				this.setLoser(optionsArray[2][0]);
		}

	
		return this.update();
	}

	async setLoser(loser) {
		this.players.entries().forEach(([playerId, player]) => {
			if (player.option === loser) {
				
				this.deletePlayer(player);
			}
		});
		
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

	async newMatch(request) {
		// Check if the match has already started and there are no players
		if (this.startsAt < Date.now() && this.playerCount === 0) {
			this.status = 'ended';
		}

		switch (this.status) {
			case 'playing':
			case 'waiting':
				// If the match is playing or waiting, try login as admin
				return this.loginAdmin(request, 'The name is being used and the password is wrong');
			case 'ended':
			case 'none':
			default:
				// If the match is ended or none, delete all data from storage and continue
				this.reset();
		}

		// Get the name, nextAt, and password from the request body
		const { name, nextAt, password } = await request.json();

		// Convert nextAt to milliseconds
		const nextAtms = new Date(nextAt).getTime();

		this.status = 'waiting';
		this.startsAt = nextAtms;

		return super.newMatch({
			name,
			password,
		});
	}



	canJoin() {
		return this.status === 'waiting';
	}
}
