import type { Db } from "./database.js";

/** Up/down ordering for a table with an integer `position` column (links, events). */
export function ordering(db: Db, table: "links" | "events") {
  const ids = () => (db.prepare(`SELECT id FROM ${table} ORDER BY position, id`).all() as { id: number }[]).map(row => row.id);
  const setPosition = db.prepare(`UPDATE ${table} SET position = ? WHERE id = ?`);
  // Positions are rewritten as 0..n-1 after every change, so a move is a swap of neighbours.
  const renumber = () => ids().forEach((id, index) => setPosition.run(index, id));
  return {
    next: () => (db.prepare(`SELECT coalesce(max(position) + 1, 0) AS next FROM ${table}`).get() as { next: number }).next,
    renumber,
    move: db.transaction((id: number, direction: "up" | "down") => {
      renumber();
      const order = ids();
      const index = order.indexOf(id);
      const other = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || other < 0 || other >= order.length) return;
      setPosition.run(other, id);
      setPosition.run(index, order[other]);
    }),
  };
}
