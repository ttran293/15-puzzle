"use client";
import { useState, useCallback, useEffect } from "react";

const COLS = 3;
const ROWS = 6;
const TOTAL_POSITIONS = COLS * ROWS;
const TILE_SIZE = 128; 

const IMG_LIST = [
  {
    id: 1,
    name: "Facade for a Church with a Sculpture Representing Faith",
    description: "French, 1739 - 1794",
    src: "/images/1.jpg",
  },
  {
    id: 2,
    name: "René de Gas by Edgar Degas",
    description: "French, 1834 - 1917",
    src: "/images/2.jpg",
  },
  {
    id: 3,
    name: "Park by Paul Klee",
    description: "Swiss, 1879 - 1940",
    src: "/images/3.jpg",
  },
  {
    id: 4,
    name: "Flowers in a Rococo Vase",
    description: "French, 1839 - 1906",
    src: "/images/4.jpg",
  },
  {
    id: 5,
    name: "Antony Valabrègue",
    description: "French, 1839 - 1906",
    src: "/images/5.jpg",
  },
  {
    id: 6,
    name: "The Gardener Vallier",
    description: "French, 1839 - 1906",
    src: "/images/6.jpg",
  },
  {
    id: 7,
    name: "Boudoir by Perkins Harnly",
    description: "American, 1901 - 1986",
    src: "/images/7.jpg",
  },
  {
    id: 8,
    name: "Flowers in a Crystal Vase",
    description: "French, 1832 - 1883",
    src: "/images/8.jpg",
  },
  {
    id: 9,
    name: "A King Charles Spaniel",
    description: "French, 1832 - 1883",
    src: "/images/9.jpg",
  },
  {
    id: 10,
    name: "Jerusalem Artichoke Flowers",
    description: "French, 1840 - 1926",
    src: "/images/10.jpg",
  },
];

const IMAGE_COLS = 3;
const IMAGE_ROWS = 5; 

const EMPTY = 0;
const BLOCKED = -1;

const BLOCKED_POSITIONS = [1, 2];

const PLAYABLE_POSITIONS = Array.from({ length: TOTAL_POSITIONS }, (_, i) => i)
  .filter(i => !BLOCKED_POSITIONS.includes(i));



const generateSolvedState = (): number[] => {
  const state: number[] = [];
  let tileNum = 1;
  for (let i = 0; i < TOTAL_POSITIONS; i++) {
    if (i === 0) {
      state.push(EMPTY);
    } else if (BLOCKED_POSITIONS.includes(i)) {
      state.push(BLOCKED);
    } else {
      state.push(tileNum++);
    }
  }
  return state;
};

const getPlayableTiles = (state: number[]): number[] => {
  return PLAYABLE_POSITIONS.map(pos => state[pos]);
};

const countInversions = (tiles: number[]) => {
  let inversions = 0;
  const filtered = tiles.filter(t => t !== EMPTY);
  for (let i = 0; i < filtered.length - 1; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      if (filtered[i] > filtered[j]) {
        inversions++;
      }
    }
  }
  return inversions;
};

const isSolvable = (state: number[]) => {
  const playable = getPlayableTiles(state);
  const inversions = countInversions(playable);
  return inversions % 2 === 0;
};

const shuffleTiles = (): number[] => {
  let state: number[];
  do {
    state = generateSolvedState();
    const playableValues = PLAYABLE_POSITIONS.map(pos => state[pos]);
    for (let i = playableValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playableValues[i], playableValues[j]] = [playableValues[j], playableValues[i]];
    }
    PLAYABLE_POSITIONS.forEach((pos, idx) => {
      state[pos] = playableValues[idx];
    });
  } while (!isSolvable(state) || JSON.stringify(getPlayableTiles(state)) === JSON.stringify(getPlayableTiles(generateSolvedState())));
  return state;
};

const getTileStyle = (tileNum: number, imageSrc: string): React.CSSProperties => {
  const col = (tileNum - 1) % IMAGE_COLS;
  const row = Math.floor((tileNum - 1) / IMAGE_COLS);
  
  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${TILE_SIZE * IMAGE_COLS}px ${TILE_SIZE * IMAGE_ROWS}px`,
    backgroundPosition: `-${col * TILE_SIZE}px -${row * TILE_SIZE}px`,
  };
};

export default function SlidingPuzzle() {
  const [tiles, setTiles] = useState<number[]>(generateSolvedState());
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [imageData, setImageData] = useState(IMG_LIST[0]); 




  useEffect(() => {
    setImageData(IMG_LIST[Math.floor(Math.random() * IMG_LIST.length)]);
  }, []);

  const checkWin = useCallback((currentTiles: number[]) => {
    const current = getPlayableTiles(currentTiles);
    const solved = getPlayableTiles(generateSolvedState());
    return JSON.stringify(current) === JSON.stringify(solved);
  }, []);

  const handleTileClick = (index: number) => {
    if (isWon || !isShuffled) return;
    if (BLOCKED_POSITIONS.includes(index)) return;
    if (tiles[index] === EMPTY) return;

    const emptyIndex = tiles.indexOf(EMPTY);
    const emptyRow = Math.floor(emptyIndex / COLS);
    const emptyCol = emptyIndex % COLS;
    const tileRow = Math.floor(index / COLS);
    const tileCol = index % COLS;

    const isAdjacent =
      (Math.abs(emptyRow - tileRow) === 1 && emptyCol === tileCol) ||
      (Math.abs(emptyCol - tileCol) === 1 && emptyRow === tileRow);

    if (isAdjacent && !BLOCKED_POSITIONS.includes(emptyIndex)) {
      const newTiles = [...tiles];
      [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
      setTiles(newTiles);
      setMoves((m) => m + 1);

      if (checkWin(newTiles)) {
        setIsWon(true);
      }
    }
  };

  const handleShuffle = () => {
    setTiles(shuffleTiles());
    setMoves(0);
    setIsWon(false);
    setIsShuffled(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div
        className={`
          relative p-6 bg-[#e6e2dc] ring-1 ring-black/15 rounded-lg
          shadow-[0_12px_28px_rgba(0,0,0,.25)]
          [box-shadow:
            inset_0_2px_0_rgba(255,255,255,.85),
            inset_0_-6px_0_rgba(0,0,0,.18),
            0_12px_28px_rgba(0,0,0,.25)
          ]
        `}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-700 max-w-[280px]">
              {imageData.name}
            </h2>
            <span className="text-sm text-stone-500">
              {imageData.description}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div
              className="border border-stone-300"
              style={{
                width: TILE_SIZE * 0.8,
                height: TILE_SIZE * 1.28,
                backgroundImage: `url(${imageData.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-3 gap-0">
            {tiles.map((tile, index) => {
              const isBlocked = BLOCKED_POSITIONS.includes(index);
              const isEmpty = tile === EMPTY;

              if (isBlocked) {
                return (
                  <div
                    key={index}
                    className="bg-[#e6e2dc] "
                    style={{ width: TILE_SIZE, height: TILE_SIZE }}
                  />
                );
              }

              return (
                <div
                  key={index}
                  onClick={() => !isEmpty && !isWon && handleTileClick(index)}
                  className={`
                    ${
                      isEmpty
                        ? "bg-stone-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_-2px_4px_rgba(0,0,0,0.3),inset_2px_0_4px_rgba(0,0,0,0.3),inset_-2px_0_4px_rgba(0,0,0,0.3)]"
                        : "cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),inset_0_-2px_4px_rgba(0,0,0,0.2),inset_2px_0_4px_rgba(0,0,0,0.2),inset_-2px_0_4px_rgba(0,0,0,0.2)]"
                    }
                  `}
                  style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    ...(!isEmpty ? getTileStyle(tile, imageData.src) : {}),
                  }}
                />
              );
            })}
          </div>
        </div>

        {!isShuffled && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-200/80">
            <button
              onClick={handleShuffle}
              className="rounded-md px-6 py-3 text-sm font-medium text-white bg-stone-700 hover:bg-stone-800 transition-all"
            >
              Start
            </button>
          </div>
        )}

        {isWon && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-200/90">
            <div className="text-center">
              <div className="text-4xl mb-3">✓</div>
              <h2 className="text-xl font-medium text-stone-800 mb-1">
                Congratulations!
              </h2>
              <p className="text-stone-500 text-sm mb-4">{moves} moves</p>
              <button
                onClick={handleShuffle}
                className="rounded-md px-5 py-2 text-sm font-medium text-white bg-stone-700 hover:bg-stone-800 transition-all"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
