import {
  SHARED_PUZZLE_ID,
  WIN_RESET_DELAY_MS,
  applyMove,
  canMakeMove,
  checkWin,
  getSecondsUntilNextMove,
  shuffleTiles,
} from "@/lib/puzzle";
import { getRandomImageId } from "@/lib/images";
import { createAdminClient } from "@/lib/supabase/admin";

export type PuzzleRow = {
  id: number;
  tiles: number[];
  image_id: number;
  moves_count: number;
  last_move_at: string | null;
  is_won: boolean;
  won_at: string | null;
  updated_at: string;
};

export type MoveLogRow = {
  id: string;
  player_name: string;
  tile_index: number;
  tile_number: number;
  created_at: string;
};

const maybeResetAfterWin = async (puzzle: PuzzleRow): Promise<PuzzleRow> => {
  if (!puzzle.is_won || !puzzle.won_at) {
    return puzzle;
  }

  const wonAt = new Date(puzzle.won_at).getTime();
  if (Date.now() - wonAt < WIN_RESET_DELAY_MS) {
    return puzzle;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("puzzle")
    .update({
      tiles: shuffleTiles(),
      image_id: getRandomImageId(),
      moves_count: 0,
      last_move_at: null,
      is_won: false,
      won_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", SHARED_PUZZLE_ID)
    .eq("is_won", true)
    .select("*")
    .single();

  if (error || !data) {
    return puzzle;
  }

  return data as PuzzleRow;
};

export const getOrCreatePuzzle = async (): Promise<PuzzleRow> => {
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("puzzle")
    .select("*")
    .eq("id", SHARED_PUZZLE_ID)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (existing) {
    return maybeResetAfterWin(existing as PuzzleRow);
  }

  const { data: created, error: createError } = await supabase
    .from("puzzle")
    .insert({
      id: SHARED_PUZZLE_ID,
      tiles: shuffleTiles(),
      image_id: getRandomImageId(),
      moves_count: 0,
      last_move_at: null,
      is_won: false,
      won_at: null,
    })
    .select("*")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to create puzzle");
  }

  return created as PuzzleRow;
};

export const getRecentMoves = async (limit = 50): Promise<MoveLogRow[]> => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("move_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MoveLogRow[];
};

export const getMovesTodayCount = async (): Promise<number> => {
  const supabase = createAdminClient();
  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  const { count, error } = await supabase
    .from("move_log")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfToday);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
};

export type MoveResult =
  | { ok: true; puzzle: PuzzleRow }
  | { ok: false; error: string; status: number };

export const submitMove = async (
  playerName: string,
  tileIndex: number,
): Promise<MoveResult> => {
  const trimmedName = playerName.trim();
  if (!trimmedName) {
    return { ok: false, error: "Please enter your name before moving.", status: 400 };
  }

  if (trimmedName.length > 30) {
    return { ok: false, error: "Name must be 30 characters or fewer.", status: 400 };
  }

  const supabase = createAdminClient();
  const puzzle = await getOrCreatePuzzle();

  if (puzzle.is_won) {
    return { ok: false, error: "Puzzle solved! A new round is starting soon.", status: 409 };
  }

  if (!canMakeMove(puzzle.last_move_at, puzzle.is_won)) {
    const seconds = getSecondsUntilNextMove(puzzle.last_move_at);
    return {
      ok: false,
      error: `Wait ${seconds}s before the next move.`,
      status: 429,
    };
  }

  const newTiles = applyMove(puzzle.tiles, tileIndex);
  if (!newTiles) {
    return { ok: false, error: "Invalid move.", status: 400 };
  }

  const tileNumber = puzzle.tiles[tileIndex];
  const now = new Date().toISOString();
  const won = checkWin(newTiles);

  const { data: updatedPuzzle, error: updateError } = await supabase
    .from("puzzle")
    .update({
      tiles: newTiles,
      moves_count: puzzle.moves_count + 1,
      last_move_at: now,
      is_won: won,
      won_at: won ? now : null,
      updated_at: now,
    })
    .eq("id", SHARED_PUZZLE_ID)
    .select("*")
    .single();

  if (updateError || !updatedPuzzle) {
    return { ok: false, error: updateError?.message ?? "Failed to update puzzle.", status: 500 };
  }

  const { error: logError } = await supabase.from("move_log").insert({
    player_name: trimmedName,
    tile_index: tileIndex,
    tile_number: tileNumber,
  });

  if (logError) {
    return { ok: false, error: logError.message, status: 500 };
  }

  return { ok: true, puzzle: updatedPuzzle as PuzzleRow };
};
