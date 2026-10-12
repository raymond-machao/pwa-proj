// Three-way merge and GitHub transport shared by desktop and PWA.
const clone = value => value === undefined ? undefined : structuredClone(value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function sharedProject(trip) {
  const result = clone(trip);
  delete result.sharedSync;
  return result;
}
export function assertShared(value, tripId) {
  if (value?.format !== 'travel-shared-v1' || value.tripId !== tripId || value.trip?.tripId !== tripId || !Array.isArray(value.trip.days)) throw Error('共享資料不是這趟旅程。');
  const inspect = v => { if (v && typeof v === 'object') for (const [k, child] of Object.entries(v)) { if (['__proto__', 'constructor', 'prototype'].includes(k)) throw Error('共享資料格式無效。'); inspect(child); } };
  inspect(value);
  return value;
}
export function mergeShared(base, local, remote, choices = {}) {
  const conflicts = [];
  function merge(b, l, r, path) {
    if (equal(l, r)) return clone(l);
    if (equal(l, b)) return clone(r);
    if (equal(r, b)) return clone(l);
    if (object(b) && object(l) && object(r)) {
      const out = {};
      for (const k of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])) {
        if (['__proto__', 'constructor', 'prototype'].includes(k)) throw Error('資料格式無效。');
        const v = merge(b[k], l[k], r[k], path + '/' + k);
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
    const rows = v => Array.isArray(v) && v.every(x => object(x) && typeof x.id === 'string' && x.id) && new Set(v.map(x => x.id)).size === v.length;
    if (rows(b) && rows(l) && rows(r)) {
      const maps = [b, l, r].map(a => new Map(a.map(x => [x.id, x])));
      const out = new Map();
      for (const id of new Set([...maps[0].keys(), ...maps[1].keys(), ...maps[2].keys()])) {
        const v = merge(maps[0].get(id), maps[1].get(id), maps[2].get(id), path + '/@' + id);
        if (v !== undefined) out.set(id, v);
      }
      // Merge ordering separately: simultaneous incompatible reorders require a choice.
      const common = b.map(x => x.id).filter(id => maps[1].has(id) && maps[2].has(id));
      const orderOf = a => a.map(x => x.id).filter(id => common.includes(id));
      const order = merge(common, orderOf(l), orderOf(r), path + '/順序');
      const preferred = equal(order, orderOf(r)) ? r : l;
      return [...new Set([...preferred.map(x => x.id), ...l.map(x => x.id), ...r.map(x => x.id)])].filter(id => out.has(id)).map(id => out.get(id));
    }
    if (choices[path] === 'local') return clone(l);
    if (choices[path] === 'remote') return clone(r);
    conflicts.push({ path, base: clone(b), local: clone(l), remote: clone(r) });
    return clone(l);
  }
  return { trip: merge(base, local, remote, ''), conflicts };
}
export function mapSignature(trip) {
  return JSON.stringify([trip.destination, (trip.days || []).map(d => [d.id, d.date, (d.stops || []).map(s => [s.id, s.kind, s.name, s.address, s.location, s.links, s.departureAirport, s.arrivalAirport])])]);
}
export function createSharedClient(target, getToken = () => '', fetcher = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(target.repository || '') || !target.branch || !target.path || target.path.split('/').some(p => !p || p === '.' || p === '..')) throw Error('共享位置設定無效。');
  const url = 'https://api.github.com/repos/' + target.repository + '/contents/' + target.path.split('/').map(encodeURIComponent).join('/');
  async function request(method, body, blobSha) {
    const token = getToken();
    const endpoint=blobSha?'https://api.github.com/repos/'+target.repository+'/git/blobs/'+blobSha:url+(method==='GET'?'?ref='+encodeURIComponent(target.branch):'');
    const response = await fetcher(endpoint, {
      method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(25000),
      headers: { Accept: method==='GET'&&!blobSha?'application/vnd.github.object+json':'application/vnd.github+json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok) { const e = Error(response.status === 401 || response.status === 403 ? 'GitHub 授權不足或查詢額度已用完，請檢查 Token。' : response.status === 409 || response.status === 422 ? '有人先儲存了新版，請重新同步。' : 'GitHub 讀寫失敗（' + response.status + '）。'); e.status = response.status; throw e; }
    return response.json();
  }
  return {
    async read() {
      const file = await request('GET');
      if (file.type !== 'file' || !file.sha || Number(file.size)>10000000) throw Error('共享檔案格式無效或超過 10 MB。');
      const blob=file.content?file:/^[a-f0-9]{40}$/.test(file.sha)?await request('GET',undefined,file.sha):null;
      if(!blob?.content)throw Error('無法讀取共享檔案內容。');
      const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), c => c.charCodeAt(0));
      return { sha: file.sha, value: JSON.parse(new TextDecoder().decode(bytes)) };
    },
    async write(value, sha) {
      if (!getToken()) throw Error('請先設定編輯授權。');
      const bytes = new TextEncoder().encode(JSON.stringify(value));
      if (bytes.length > 10000000) throw Error('共享資料超過 10 MB，請減少附件大小後再儲存。');
      let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
      const result = await request('PUT', { message: 'Update shared trip', content: btoa(binary), sha, branch: target.branch });
      return result.content.sha;
    }
  };
}
