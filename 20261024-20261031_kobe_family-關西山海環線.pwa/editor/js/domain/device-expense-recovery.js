// Older releases stored two independent expense snapshots without a common
// revision. Treat disagreement as a recovery conflict, never as a deletion.
export function expenseRecoveryBase(left, right) {
  const a = new Map(left.map(row => [row.id, row]));
  const b = new Map(right.map(row => [row.id, row]));
  return [...new Set([...a.keys(), ...b.keys()])].map(id =>
    JSON.stringify(a.get(id)) === JSON.stringify(b.get(id))
      ? structuredClone(a.get(id)) : {id, recoveryUnknown: true});
}
