// Older releases stored two independent expense snapshots without a common
// revision. Treat disagreement as a recovery conflict, never as a deletion.
export function expenseRecoveryBase(left, right) {
  const a = new Map(left.map(row => [row.id, row]));
  const b = new Map(right.map(row => [row.id, row]));
  return [...new Set([...a.keys(), ...b.keys()])].map(id =>
    JSON.stringify(a.get(id)) === JSON.stringify(b.get(id))
      ? structuredClone(a.get(id)) : {id, recoveryUnknown: true});
}

// One explicit recovery decision: the confirmed phone row wins by identity.
// Missing phone rows are not evidence of deletion; keep cloud-only rows.
export function restoreDeviceExpenses(phone, remote) {
  for (const rows of [phone, remote]) {
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string' || !row.id) || new Set(rows.map(row => row.id)).size !== rows.length)
      throw Error('記帳識別不完整或重複，已保留原始資料，尚未同步。');
  }
  const ids = new Set(phone.map(row => row.id));
  return structuredClone([...phone, ...remote.filter(row => !ids.has(row.id))]);
}
