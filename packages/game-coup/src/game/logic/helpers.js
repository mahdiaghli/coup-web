import { newDeck } from "../../utils/deck";

export function drawOneFromState(state) {
  if (!state.deck || state.deck.length === 0) state.deck = newDeck();
  return state.deck.pop();
}

export function checkWinner(state, pushLog, setGameState) {
  const alive = state.players.filter((p) => p.alive);
  if (alive.length === 1) {
    state.winner = alive[0].id;
    pushLog(`${alive[0].name} برنده شد!`);
    setGameState({ ...state });
  }
}

export function advanceTurn(state, setGameState, checkWinnerImpl) {
  const alive = state.players.filter((p) => p.alive);
  if (alive.length <= 1) {
    checkWinnerImpl(state);
    return;
  }
  const next = { ...state };
  let idx = (next.turn + 1) % next.players.length;
  let tries = 0;
  while (!next.players[idx].alive && tries < next.players.length) {
    idx = (idx + 1) % next.players.length;
    tries++;
  }
  next.turn = idx;
  next.pendingAction = null;
  next.pendingExchange = null;
  next.pendingLose = null;
  setGameState(next);
}
