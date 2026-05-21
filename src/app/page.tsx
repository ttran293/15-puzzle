"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ImageData } from "@/lib/images";
import {
  BLOCKED_POSITIONS,
  COLS,
  EMPTY,
  IMAGE_COLS,
  IMAGE_ROWS,
  ROWS,
} from "@/lib/puzzle";

type MoveLogEntry = {
  id: string;
  playerName: string;
  tileIndex: number;
  tileNumber: number;
  createdAt: string;
};

type PuzzleState = {
  tiles: number[];
  image: ImageData;
  movesCount: number;
  movesToday: number;
  isWon: boolean;
  canMove: boolean;
  secondsUntilNextMove: number;
  moveLog: MoveLogEntry[];
};

const PLAYER_NAME_KEY = "sliding-puzzle-player-name";
const POLL_INTERVAL_MS = 2500;
const SIDEBAR_WIDTH = 280;
const COLUMN_GAP = 32;

const calculateTileSize = (screenWidth: number, screenHeight: number) => {
  const isWide = screenWidth >= 1024;
  const framePadding = isWide ? 56 : 40;
  const panelMax = 980;
  const panelWidth = Math.min(screenWidth - 48, panelMax);
  const puzzleAreaWidth = isWide
    ? panelWidth - SIDEBAR_WIDTH - COLUMN_GAP - framePadding
    : panelWidth - framePadding;
  const widthBasedSize = Math.floor(puzzleAreaWidth / COLS);

  let verticalPadding: number;
  let maxSize: number;

  if (screenHeight < 700) {
    verticalPadding = isWide ? 160 : 280;
    maxSize = 72;
  } else if (screenHeight < 900) {
    verticalPadding = isWide ? 180 : 300;
    maxSize = 88;
  } else if (screenHeight < 1080) {
    verticalPadding = isWide ? 200 : 320;
    maxSize = 100;
  } else {
    verticalPadding = isWide ? 220 : 360;
    maxSize = 110;
  }

  const heightBasedSize = Math.floor((screenHeight - verticalPadding) / ROWS);
  const size = Math.min(widthBasedSize, heightBasedSize);
  return Math.max(64, Math.min(size, maxSize));
};

const useTileSize = () => {
  const [tileSize, setTileSize] = useState(70);

  useEffect(() => {
    const handleResize = () => {
      setTileSize(calculateTileSize(window.innerWidth, window.innerHeight));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return tileSize;
};

const getTileStyle = (
  tileNum: number,
  imageSrc: string,
  tileSize: number,
): React.CSSProperties => {
  const col = (tileNum - 1) % IMAGE_COLS;
  const row = Math.floor((tileNum - 1) / IMAGE_COLS);

  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${tileSize * IMAGE_COLS}px ${tileSize * IMAGE_ROWS}px`,
    backgroundPosition: `-${col * tileSize}px -${row * tileSize}px`,
  };
};

const formatMoveTime = (iso: string) => {
  return new Date(iso).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function SlidingPuzzle() {
  const tileSize = useTileSize();
  const [puzzleState, setPuzzleState] = useState<PuzzleState | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [moveSound, setMoveSound] = useState<HTMLAudioElement | null>(null);
  const [winSound, setWinSound] = useState<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem(PLAYER_NAME_KEY);
    if (savedName) {
      setPlayerName(savedName);
    }

    setMoveSound(new Audio("/sound/mixkit-twig-breaking-2945.wav"));
    setWinSound(new Audio("/sound/mixkit-achievement-bell-600.wav"));
  }, []);

  useEffect(() => {
    localStorage.setItem(PLAYER_NAME_KEY, playerName);
  }, [playerName]);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load puzzle");
      }

      setPuzzleState(data);
      setCountdown(data.secondsUntilNextMove ?? 0);
      setHasLoadError(false);
    } catch {
      setHasLoadError(true);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchState]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [puzzleState?.moveLog.length]);

  const handleTileClick = async (index: number) => {
    if (!puzzleState || isSubmitting) {
      return;
    }

    if (!playerName.trim()) {
      setStatusMessage("Enter your name before making a move.");
      return;
    }

    if (puzzleState.isWon) {
      return;
    }

    if (countdown > 0) {
      setStatusMessage(`Wait ${countdown}s before the next move.`);
      return;
    }

    if (BLOCKED_POSITIONS.includes(index) || puzzleState.tiles[index] === EMPTY) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName.trim(), tileIndex: index }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatusMessage(data.error ?? "Move failed.");
        if (typeof data.error === "string" && data.error.includes("Wait")) {
          const match = data.error.match(/(\d+)s/);
          if (match) {
            setCountdown(Number(match[1]));
          }
        }
        return;
      }

      setPuzzleState(data);
      setCountdown(data.secondsUntilNextMove ?? 0);

      if (moveSound) {
        moveSound.currentTime = 0;
        moveSound.play().catch(() => {});
      }

      if (data.isWon && winSound) {
        winSound.currentTime = 0;
        winSound.play().catch(() => {});
      }
    } catch {
      setStatusMessage("Could not submit move. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tiles = puzzleState?.tiles ?? [];
  const imageData = puzzleState?.image;
  const isWon = puzzleState?.isWon ?? false;
  const canInteract = Boolean(playerName.trim()) && countdown === 0 && !isWon && !isSubmitting;
  const moveLog = [...(puzzleState?.moveLog ?? [])].reverse();
  const gridWidth = tileSize * COLS;
  const gridHeight = tileSize * ROWS;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-white">
      <div
        className={`
          relative w-fit max-w-full
          p-3 sm:p-4 md:p-5 bg-[#e6e2dc] ring-1 ring-black/15 rounded-lg
          shadow-[0_12px_28px_rgba(0,0,0,.25)]
          [box-shadow:
            inset_0_2px_0_rgba(255,255,255,.85),
            inset_0_-6px_0_rgba(0,0,0,.18),
            0_12px_28px_rgba(0,0,0,.25)
          ]
          flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-8
        `}
      >
        {/* Puzzle */}
        <div className="shrink-0 w-fit max-w-full">
          {hasLoadError ? (
            <div className="p-8 text-center text-sm text-stone-600">
              <p>Something went wrong.</p>
              <p className="mt-1">Try again later.</p>
            </div>
          ) : !imageData ? (
            <div className="p-8 text-center text-sm text-stone-600">Loading shared puzzle...</div>
          ) : (
            <>
              <div
                className="flex justify-between items-start mb-2 sm:mb-3 md:mb-4 gap-2 sm:gap-3"
                style={{ width: gridWidth }}
              >
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-sm sm:text-base md:text-lg font-semibold text-stone-700 leading-tight mb-0.5 sm:mb-1"
                    style={{ maxWidth: tileSize * 2.2 }}
                  >
                    {imageData.name}
                  </h2>
                  <span className="text-[10px] sm:text-xs md:text-sm text-stone-500 leading-tight block">
                    {imageData.description}
                  </span>
                </div>
                <div className="shrink-0">
                  <div
                    className="border border-stone-300"
                    style={{
                      width: tileSize * 0.65,
                      height: tileSize * 1.1,
                      backgroundImage: `url(${imageData.src})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                </div>
              </div>

              <div className="relative" style={{ width: gridWidth, height: gridHeight }}>
                {isWon && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-900/40 rounded">
                    <p className="text-white font-semibold text-sm sm:text-base px-4 text-center">
                      Puzzle solved! New round starting soon...
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-0">
                  {tiles.map((tile, index) => {
                    const isBlocked = BLOCKED_POSITIONS.includes(index);
                    const isEmpty = tile === EMPTY;

                    if (isBlocked) {
                      return (
                        <div
                          key={index}
                          className="bg-[#e6e2dc]"
                          style={{ width: tileSize, height: tileSize }}
                        />
                      );
                    }

                    return (
                      <div
                        key={index}
                        onClick={() => canInteract && !isEmpty && handleTileClick(index)}
                        className={`
                          ${
                            isEmpty
                              ? "bg-stone-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_-2px_4px_rgba(0,0,0,0.3),inset_2px_0_4px_rgba(0,0,0,0.3),inset_-2px_0_4px_rgba(0,0,0,0.3)]"
                              : canInteract
                                ? "cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),inset_0_-2px_4px_rgba(0,0,0,0.2),inset_2px_0_4px_rgba(0,0,0,0.2),inset_-2px_0_4px_rgba(0,0,0,0.2)]"
                                : "opacity-80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),inset_0_-2px_4px_rgba(0,0,0,0.2),inset_2px_0_4px_rgba(0,0,0,0.2),inset_-2px_0_4px_rgba(0,0,0,0.2)]"
                          }
                        `}
                        style={{
                          width: tileSize,
                          height: tileSize,
                          ...(!isEmpty ? getTileStyle(tile, imageData.src, tileSize) : {}),
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <p
                className="text-[10px] sm:text-xs text-stone-500 mt-2 sm:mt-3 text-center"
                style={{ width: gridWidth }}
              >
                # Move Today: {puzzleState?.movesToday ?? 0}
              </p>
            </>
          )}
        </div>

        {/* Chat */}
        <div
          className="w-full lg:w-[280px] shrink-0 flex flex-col border-t border-stone-400/25 pt-5 lg:pt-0 lg:border-t-0 lg:border-l lg:border-stone-400/25 lg:pl-6"
          style={{ minHeight: gridHeight }}
        >
          <div className="mb-2">
            <h3 className="text-sm sm:text-base font-semibold text-stone-700">Move log</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 min-h-[120px] lg:min-h-0 mb-3">
            {moveLog.length === 0 ? (
              <p className="text-sm text-stone-500">No moves yet. Be the first!</p>
            ) : (
              moveLog.map((entry) => (
                <div key={entry.id} className="text-sm">
                  <span className="font-medium text-stone-800">{entry.playerName}</span>
                  <span className="text-stone-600"> moved tile {entry.tileNumber}</span>
                  <span className="block text-[11px] text-stone-400">
                    {formatMoveTime(entry.createdAt)}
                  </span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="space-y-2 border-t border-stone-400/30 pt-3 mt-auto">
            <label htmlFor="player-name" className="block text-xs sm:text-sm text-stone-600">
              Your name (required to move)
            </label>
            <input
              id="player-name"
              type="text"
              maxLength={30}
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500"
            />
            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
              {countdown > 0 ? (
                <span className="text-amber-700">Next move in {countdown}s</span>
              ) : isWon ? (
                <span className="text-green-700">Round complete</span>
              ) : (
                <span className="text-stone-600">You can move now</span>
              )}
              {isSubmitting && <span className="text-stone-500">Submitting...</span>}
            </div>
            {statusMessage && (
              <p className="text-xs sm:text-sm text-red-600">{statusMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
