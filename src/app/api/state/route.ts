import { NextResponse } from "next/server";
import { getImageById } from "@/lib/images";
import { canMakeMove, getSecondsUntilNextMove } from "@/lib/puzzle";
import { getOrCreatePuzzle, getMovesTodayCount, getRecentMoves } from "@/lib/game-state";

export async function GET() {
  try {
    const puzzle = await getOrCreatePuzzle();
    const moves = await getRecentMoves();
    const movesToday = await getMovesTodayCount();
    const image = getImageById(puzzle.image_id);

    return NextResponse.json({
      tiles: puzzle.tiles,
      imageId: puzzle.image_id,
      image,
      movesCount: puzzle.moves_count,
      movesToday,
      isWon: puzzle.is_won,
      lastMoveAt: puzzle.last_move_at,
      wonAt: puzzle.won_at,
      canMove: canMakeMove(puzzle.last_move_at, puzzle.is_won),
      secondsUntilNextMove: getSecondsUntilNextMove(puzzle.last_move_at),
      moveLog: moves.map((move) => ({
        id: move.id,
        playerName: move.player_name,
        tileIndex: move.tile_index,
        tileNumber: move.tile_number,
        createdAt: move.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load puzzle state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
