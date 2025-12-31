"use client";
import { useState, useCallback, useEffect } from "react";

const COLS = 3;
const ROWS = 6;
const TOTAL_POSITIONS = COLS * ROWS;

const useTileSize = () => {
  const [tileSize, setTileSize] = useState(128);

  useEffect(() => {
    const calculateSize = () => {
      const screenWidth = window.innerWidth;
      const padding = 48; 
      const maxWidth = Math.min(screenWidth - padding, 450); 
      const size = Math.floor(maxWidth / COLS);
      setTileSize(Math.min(size, 128));
    };

    calculateSize();
    window.addEventListener("resize", calculateSize);
    return () => window.removeEventListener("resize", calculateSize);
  }, []);

  return tileSize;
}; 

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

const SOLVED_STATE: number[] = [
  EMPTY, BLOCKED, BLOCKED, // Row 1: Position 0, 1, 2
  1, 2, 3,                 // Row 2
  4, 5, 6,                 // Row 3
  7, 8, 9,                 // Row 4
  10, 11, 12,              // Row 5
  13, 14, 15               // Row 6
];

const getPlayableTiles = (state: number[]): number[] => {
  return PLAYABLE_POSITIONS.map(pos => state[pos]);
};

const getValidMoves = (state: number[], emptyPos: number): number[] => {
  const moves: number[] = [];
  const row = Math.floor(emptyPos / COLS);
  const col = emptyPos % COLS;
  
  // Check all 4 directions
  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 0 },  // down
    { dr: 0, dc: -1 }, // left
    { dr: 0, dc: 1 },  // right
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

const shuffleTiles = (): number[] => {
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
      console.warn("Max shuffle attempts reached, using current state");
      break;
    }
  } while (JSON.stringify(getPlayableTiles(state)) === JSON.stringify(getPlayableTiles(SOLVED_STATE)));
  
  return state;
};

const getTileStyle = (tileNum: number, imageSrc: string, tileSize: number): React.CSSProperties => {
  const col = (tileNum - 1) % IMAGE_COLS;
  const row = Math.floor((tileNum - 1) / IMAGE_COLS);
  
  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${tileSize * IMAGE_COLS}px ${tileSize * IMAGE_ROWS}px`,
    backgroundPosition: `-${col * tileSize}px -${row * tileSize}px`,
  };
};

export default function SlidingPuzzle() {
  const tileSize = useTileSize();
  const [tiles, setTiles] = useState<number[]>(SOLVED_STATE);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [imageData, setImageData] = useState(IMG_LIST[0]); 
  const [moveSound, setMoveSound] = useState<HTMLAudioElement | null>(null);
  const [winSound, setWinSound] = useState<HTMLAudioElement | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setImageData(IMG_LIST[Math.floor(Math.random() * IMG_LIST.length)]);
    setMoveSound(new Audio('/sound/mixkit-twig-breaking-2945.wav'));
    setWinSound(new Audio("/sound/mixkit-achievement-bell-600.wav"));
  }, []);

  const checkWin = useCallback((currentTiles: number[]) => {
    const current = getPlayableTiles(currentTiles);
    const solved = getPlayableTiles(SOLVED_STATE);
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

      if (moveSound) {
        moveSound.currentTime = 0;
        moveSound.play().catch(() => {
        });
      }

      if (checkWin(newTiles)) {
        setIsWon(true);
        if (winSound) {
          winSound.currentTime = 0;
          winSound.play().catch(() => {
          });
        }
        
        setTimeout(() => {
          setIsTransitioning(true);
        }, 3000);
        
        setTimeout(() => {
          setImageData(IMG_LIST[Math.floor(Math.random() * IMG_LIST.length)]);
          setTiles(shuffleTiles());
          setMoves(0);
          setIsWon(false);
          setIsShuffled(true);
        }, 4000);
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, 4100);
      }
    }
  };

  const handleShuffle = () => {
    setIsTransitioning(true);
    
    setTimeout(() => {
      setTiles(shuffleTiles());
      setMoves(0);
      setIsWon(false);
      setIsShuffled(true);
    }, 500);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 bg-white">
      <div
        className={`
          relative p-4 sm:p-6 bg-[#e6e2dc] ring-1 ring-black/15 rounded-lg
          shadow-[0_12px_28px_rgba(0,0,0,.25)]
          [box-shadow:
            inset_0_2px_0_rgba(255,255,255,.85),
            inset_0_-6px_0_rgba(0,0,0,.18),
            0_12px_28px_rgba(0,0,0,.25)
          ]
        `}
      >
        <div className={`flex justify-between items-start mb-3 sm:mb-4 gap-3 transition-opacity duration-1000 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex-1 min-w-0">
            <h2
              className="text-base sm:text-xl font-semibold text-stone-700 leading-tight"
              style={{ maxWidth: tileSize * 2.2 }}
            >
              {imageData.name}
            </h2>
            <span className="text-xs sm:text-sm text-stone-500">
              {imageData.description}
            </span>
          </div>
          <div className="shrink-0">
            <div
              className="border border-stone-300"
              style={{
                width: tileSize * 0.7,
                height: tileSize * 1.12,
                backgroundImage: `url(${imageData.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </div>
        </div>

        <div className={`relative transition-opacity duration-1000 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <div className="grid grid-cols-3 gap-0">
            {tiles.map((tile, index) => {
              const isBlocked = BLOCKED_POSITIONS.includes(index);
              const isEmpty = tile === EMPTY;

              if (isBlocked) {
                return (
                  <div
                    key={index}
                    className="bg-[#e6e2dc] "
                    style={{ width: tileSize, height: tileSize }}
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
                    width: tileSize,
                    height: tileSize,
                    ...(!isEmpty
                      ? getTileStyle(tile, imageData.src, tileSize)
                      : {}),
                  }}
                />
              );
            })}
          </div>
        </div>

        {!isShuffled && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-200/50 rounded-lg">
            <button
              onClick={handleShuffle}
              className="rounded-md px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-white bg-stone-700 hover:bg-stone-800 transition-all"
            >
              Start
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
