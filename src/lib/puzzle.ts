export const COLS = 3;
export const ROWS = 6;
export const TOTAL_POSITIONS = COLS * ROWS;
export const IMAGE_COLS = 3;
export const IMAGE_ROWS = 5;

export const EMPTY = 0;
export const BLOCKED = -1;

export const BLOCKED_POSITIONS = [1, 2];
export const MOVE_COOLDOWN_MS = 30_000;
export const WIN_RESET_DELAY_MS = 4_000;
export const SHARED_PUZZLE_ID = 1;

export const PLAYABLE_POSITIONS = Array.from({ length: TOTAL_POSITIONS }, (_, i) => i).filter(
  (i) => !BLOCKED_POSITIONS.includes(i),
);

export const SOLVED_STATE: number[] = [
  EMPTY,
  BLOCKED,
  BLOCKED,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
];

export const getPlayableTiles = (state: number[]): number[] => {
  return PLAYABLE_POSITIONS.map((pos) => state[pos]);
};

export const getValidMoves = (state: number[], emptyPos: number): number[] => {
  const moves: number[] = [];
  const row = Math.floor(emptyPos / COLS);
  const col = emptyPos % COLS;

  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  for (const { dr, dc } of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
      const newPos = newRow * COLS + newCol;
      if (!BLOCKED_POSITIONS.includes(newPos)) {
        moves.push(newPos);
      }
    }
  }

  return moves;
};

export const shuffleTiles = (): number[] => {
  let state: number[];
  let attempts = 0;
  const maxAttempts = 1000;

  do {
    state = [...SOLVED_STATE];
    const numMoves = 100 + Math.floor(Math.random() * 200);

    for (let i = 0; i < numMoves; i++) {
      const emptyPos = state.indexOf(EMPTY);
      const validMoves = getValidMoves(state, emptyPos);

      if (validMoves.length > 0) {
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        [state[emptyPos], state[randomMove]] = [state[randomMove], state[emptyPos]];
      }
    }

    attempts++;
    if (attempts >= maxAttempts) {
      break;
    }
  } while (
    JSON.stringify(getPlayableTiles(state)) === JSON.stringify(getPlayableTiles(SOLVED_STATE))
  );

  return state;
};

export const checkWin = (currentTiles: number[]): boolean => {
  const current = getPlayableTiles(currentTiles);
  const solved = getPlayableTiles(SOLVED_STATE);
  return JSON.stringify(current) === JSON.stringify(solved);
};

export const isAdjacentToEmpty = (state: number[], tileIndex: number): boolean => {
  if (BLOCKED_POSITIONS.includes(tileIndex)) {
    return false;
  }

  if (state[tileIndex] === EMPTY) {
    return false;
  }

  const emptyIndex = state.indexOf(EMPTY);
  const emptyRow = Math.floor(emptyIndex / COLS);
  const emptyCol = emptyIndex % COLS;
  const tileRow = Math.floor(tileIndex / COLS);
  const tileCol = tileIndex % COLS;

  return (
    (Math.abs(emptyRow - tileRow) === 1 && emptyCol === tileCol) ||
    (Math.abs(emptyCol - tileCol) === 1 && emptyRow === tileRow)
  );
};

export const applyMove = (state: number[], tileIndex: number): number[] | null => {
  if (!isAdjacentToEmpty(state, tileIndex)) {
    return null;
  }

  const newTiles = [...state];
  const emptyIndex = newTiles.indexOf(EMPTY);
  [newTiles[tileIndex], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[tileIndex]];
  return newTiles;
};

export const getSecondsUntilNextMove = (lastMoveAt: string | null): number => {
  if (!lastMoveAt) {
    return 0;
  }

  const elapsed = Date.now() - new Date(lastMoveAt).getTime();
  const remaining = MOVE_COOLDOWN_MS - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
};

export const canMakeMove = (lastMoveAt: string | null, isWon: boolean): boolean => {
  if (isWon) {
    return false;
  }

  return getSecondsUntilNextMove(lastMoveAt) === 0;
};
