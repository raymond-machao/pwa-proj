// This factory is also embedded in the single-file mobile export. Keep it dependency-free.
export function createMobileTransferTools() {
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const identity = trip => ({ title: trip.title || '', startDate: trip.startDate || '', endDate: trip.endDate || '', dayIds: (trip.days || []).map(day => day.id) });
  function expense(row, home = 'TWD') {
    return {
      id: row.id, day: row.day || row.dayId || 'day-0', time: row.time || row.occurredAt || '',
      description: row.description || '', category: row.category || '', currency: String(row.currency || home).toUpperCase(),
      amount: Number(row.amount) || 0, fee: Number(row.fee ?? row.feeAmount) || 0,
      payerId: row.payerId || '', participantIds: Array.isArray(row.participantIds) ? row.participantIds.slice() : [],
      payer: row.payer || '', people: Math.max(1, Number(row.people ?? row.participantCount) || 1),
    };
  }
  function state(trip) {
    return {
      packing: Object.fromEntries((trip.packingGroups || []).flatMap(group => (group.items || []).map(item => [item.id, Boolean(item.checked)]))),
      expenses: (trip.previewState?.expenses || trip.expenses || []).map(row => expense(row, trip.settings?.homeCurrency)),
    };
  }
  const line = value => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
  function markdown(trip, baseline, current) {
    const payload = { format: 'travel-planner-mobile', version: 1, trip: identity(trip), exportedAt: new Date().toISOString(), base: clone(baseline), current: clone(current) };
    const days = new Map((trip.days || []).map((day, index) => [day.id, `Day ${index + 1} ${day.date || ''}`]));
    const people = new Map((trip.settings?.travelers || []).map(person => [person.id, person.name]));
    const rows = ['# ' + line(trip.title) + ' — 記帳與清單', '', '日期：' + line(trip.startDate) + ' ～ ' + line(trip.endDate), '', '## 記帳', '', '| 日期 | 時間 | 項目 | 金額 | 手續費 | 幣別 | 付款人 |', '| --- | --- | --- | ---: | ---: | --- | --- |'];
    for (const row of current.expenses) rows.push('| ' + [days.get(row.day) || 'Day 0', row.time, row.description, row.amount, row.fee, row.currency, people.get(row.payerId) || row.payer].map(line).join(' | ') + ' |');
    rows.push('', '## 清單', '');
    for (const group of trip.packingGroups || []) {
      rows.push('### ' + line(group.title), '');
      for (const item of group.items || []) rows.push(`- [${current.packing[item.id] ? 'x' : ' '}] ${line(item.text)}`);
      rows.push('');
    }
    rows.push('## 電腦匯入資料', '', '請保留以下資料區塊；上方文字供閱讀，電腦匯入以此區塊為準。', '', '```travel-planner-mobile-v1', JSON.stringify(payload).replace(/`/g, '\\u0060'), '```', '');
    return rows.join('\n');
  }
  function validateState(value) {
    if (!value || !Array.isArray(value.expenses) || !value.packing || typeof value.packing !== 'object' || Array.isArray(value.packing)) throw Error('記帳或清單格式不正確。');
    const ids = new Set();
    for (const row of value.expenses) {
      if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw Error('記帳識別碼缺失或重複。');
      ids.add(row.id);
      for (const field of ['day', 'time', 'description', 'category', 'currency', 'payerId', 'payer']) if (typeof row[field] !== 'string') throw Error('記帳文字欄位格式不正確。');
      for (const field of ['amount', 'fee', 'people']) if (typeof row[field] !== 'number' || !Number.isFinite(row[field])) throw Error('記帳金額或人數格式不正確。');
      if (row.people < 1 || !Array.isArray(row.participantIds) || row.participantIds.some(id => typeof id !== 'string')) throw Error('分攤資料格式不正確。');
    }
    if (Object.values(value.packing).some(value => typeof value !== 'boolean')) throw Error('清單勾選格式不正確。');
    return { expenses: value.expenses.map(row => expense(row)), packing: Object.fromEntries(Object.entries(value.packing)) };
  }
  function parse(text) {
    if (text.length > 10 * 1024 * 1024) throw Error('MD 檔案過大。');
    const matches = [...text.matchAll(/^```travel-planner-mobile-v1\r?\n([\s\S]*?)\r?\n```[ \t]*\r?$/gm)];
    if (matches.length !== 1) throw Error('請選擇手機「分享記帳與清單」產生的完整 MD 檔案。');
    let value;
    try { value = JSON.parse(matches[0][1]); } catch { throw Error('MD 匯入資料已損壞。'); }
    if (value?.format !== 'travel-planner-mobile' || value.version !== 1) throw Error('不支援此分享版本。');
    if (!value.trip || ['title', 'startDate', 'endDate'].some(key => typeof value.trip[key] !== 'string') || !Array.isArray(value.trip.dayIds) || value.trip.dayIds.some(id => typeof id !== 'string')) throw Error('旅程資料格式不正確。');
    return { ...value, base: validateState(value.base), current: validateState(value.current) };
  }
  function plan(trip, payload) {
    if (!equal(identity(trip), payload.trip)) throw Error('這份 MD 不屬於目前旅程，或旅程名稱／日期／天數已變更。請開啟分享來源的專案。');
    const desktop = state(trip), changes = [], ignored = [];
    const add = (kind, id, base, local, incoming, label) => {
      if (equal(incoming, base) || equal(incoming, local)) return;
      changes.push({ kind, id, local, incoming, label, conflict: !equal(local, base) });
    };
    const baseExpenses = new Map(payload.base.expenses.map(row => [row.id, row]));
    const phoneExpenses = new Map(payload.current.expenses.map(row => [row.id, row]));
    const localExpenses = new Map(desktop.expenses.map(row => [row.id, row]));
    const dayIds = new Set(['day-0', ...(trip.days || []).map(day => day.id)]);
    for (const id of new Set([...baseExpenses.keys(), ...phoneExpenses.keys()])) {
      const incoming = phoneExpenses.get(id), base = baseExpenses.get(id), local = localExpenses.get(id);
      if (incoming && !dayIds.has(incoming.day)) throw Error('記帳指向不存在的行程日期。');
      add('expense', id, base, local, incoming, (incoming || local || base).description || '記帳');
    }
    const labels = new Map((trip.packingGroups || []).flatMap(group => (group.items || []).map(item => [item.id, item.text])));
    for (const [id, incoming] of Object.entries(payload.current.packing)) {
      if (!labels.has(id)) { ignored.push(id); continue; }
      if (!Object.hasOwn(payload.base.packing, id)) throw Error('清單缺少原始勾選資料。');
      add('packing', id, payload.base.packing[id], desktop.packing[id], incoming, labels.get(id));
    }
    return { desktop, changes, ignored };
  }
  function apply(plan, choices = {}) {
    const expenses = new Map(plan.desktop.expenses.map(row => [row.id, clone(row)]));
    const packing = { ...plan.desktop.packing };
    for (const [index, change] of plan.changes.entries()) {
      const choice = choices[index];
      if (change.conflict && !['desktop', 'phone'].includes(choice)) throw Error('請先選擇衝突資料的處理方式。');
      if (choice === 'desktop') continue;
      if (change.kind === 'packing') Object.defineProperty(packing, change.id, { value: change.incoming, enumerable: true, writable: true, configurable: true });
      else if (change.incoming === undefined) expenses.delete(change.id);
      else expenses.set(change.id, clone(change.incoming));
    }
    return { packing, expenses: [...expenses.values()] };
  }
  return { identity, expense, state, markdown, parse, plan, apply };
}
