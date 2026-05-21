import { NextResponse } from "next/server";
import { getImageById } from "@/lib/images";
import { canMakeMove, getSecondsUntilNextMove } from "@/lib/puzzle";
import { getMovesTodayCount, getRecentMoves, submitMove } from "@/lib/game-state";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name : "";
    const tileIndex = typeof body.tileIndex === "number" ? body.tileIndex : NaN;

    if (Number.isNaN(tileIndex)) {
      return NextResponse.json({ error: "Invalid tile index." }, { status: 400 });
    }

    const result = await submitMove(name, tileIndex);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const moves = await getRecentMoves();
    const movesToday = await getMovesTodayCount();
    const image = getImageById(result.puzzle.image_id);

    return NextResponse.json({
      tiles: result.puzzle.tiles,
      imageId: result.puzzle.image_id,
      image,
      movesCount: result.puzzle.moves_count,
      movesToday,
      isWon: result.puzzle.is_won,
      lastMoveAt: result.puzzle.last_move_at,
      wonAt: result.puzzle.won_at,
      canMove: canMakeMove(result.puzzle.last_move_at, result.puzzle.is_won),
      secondsUntilNextMove: getSecondsUntilNextMove(result.puzzle.last_move_at),
      moveLog: moves.map((move) => ({
        id: move.id,
        playerName: move.player_name,
        tileIndex: move.tile_index,
        tileNumber: move.tile_number,
        createdAt: move.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit move";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
