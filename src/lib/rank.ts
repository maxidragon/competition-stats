export interface Ranked<T> {
  row: T;
  /** 1-based; tied rows share a position and the next row skips past them. */
  position: number;
}

/**
 * Assigns positions to rows that are already sorted, giving tied neighbours
 * the same position: "1, 2, 2, 4". `isTie` compares a row with the one before
 * it.
 */
export const rankWithTies = <T>(
  sortedRows: readonly T[],
  isTie: (previous: T, current: T) => boolean
): Ranked<T>[] =>
  sortedRows.reduce<Ranked<T>[]>((ranked, row, index) => {
    const previous = ranked[index - 1];
    const tied = previous !== undefined && isTie(previous.row, row);
    ranked.push({ row, position: tied ? previous.position : index + 1 });
    return ranked;
  }, []);
