# Rock Paper Scissors duck

## Description

This is a massive multiplayer game of rock paper scissors, with ducks.

## How to play

Players have 10 seconds to choose between rock, paper, scissors or duck. If they don't choose, they get a duck.

Rocks, papers and scissors are played as usual.

But this is massive multiplayer, so it's very likely that all three options will be played at the same time.

In that case, the option with fewer players loses. If there's a tie on the less played options, Rock Paper Scissors rules apply to untie.

Ducks lose if the amount of ducks is greater or equal to the greatest of all options.

## UX

### Creating a game.

The user goes to the main page where

- sets a name
- selects "rock, paper, scissors ducks"
- sets a starting time
- sets a intro text
- sets a prize
- and clicks "Create game".

The user is redirected to the control page, where they can create links to share the game, and where they can find a token to use the API to create links.

### Joining a game

The user follows a link to the game, sets a name, and clicks "Join game".

The user is redirected to the game page, where they can see the game, and where they can play.

### Playing

The user selects and option and waits for the round to end.

Rounds end automatically after 10 seconds, or when all players have chosen.

The next round starts automatically.

Users who have lost become ghosts, and can play but their choice won't count for the game. They just play for fun.

After a round ends, the user can see the results of the round, as a label below every option.

### Ending the game

The game ends when there's only one player left.

The winner is shown a message, and the game is deleted.

## REST API

We offer an API to create games and to get links to join games.

### Creating a game

To create a game, you need to send a POST request to `/api/newMatch` with the following parameters:

```json
{
  "name": "The name of the game",
  "intro": "The intro text",
  "prizes": {
    "1": {
      "name": "The name of the first prize",
      "link": "The url of the prize"
    },
    "2": {
      "name": "The name of the second prize",
      "link": "The url of the prize"
    },
    "3": {
      "name": "The name of the third prize",
      "link": "The url of the prize"
    },
    "10": {
      "name": "The name of the first 10th prize",
      "link": "The url of the prize"
    }
  },
  "startingTime": "The starting time ISO 8601 format"
}
```

The response is like

```json
{
  "token": "The token to use the API",
  "control": "The admin panel of the game",
  "joinAll": "A link to join the game, that can be used unlimited times"
}
```
