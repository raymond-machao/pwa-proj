import {referenceCategory, referenceSuggestions, categoryDisplayText} from '../domain/reference-categories.js';
import {readAttachment} from '../domain/attachments.js';
import { assertShared, createSharedClient, sharedProject, mapSignature, mergeShared } from '../domain/shared-trip.js';
import { resolveSharedMerge } from '../ui/shared-conflicts.js';
import { bindCategoryCombobox } from '../ui/category-combobox.js';
import { createMobileTransferTools } from '../domain/mobile-transfer.js';
import { createDeviceDraftStorage } from './device-draft-storage.js';
import { newDay, newStop, newNote, newReference, newPackingGroup, newPackingItem } from '../domain/trip-defaults.js';

// PWA uses on-device credentials. Desktop preview uses memory only, with no GitHub requests.
export async function installSharedRuntime(config) {
  if (!window.__travelSharedTrip || window.__travelSharedController) return;
  const preview = Boolean(config.preview);
  const notifyPreview = contentChanged => {
    if(!preview)return Promise.resolve(true);
    return new Promise(resolve => {
      const nextBaseline=copy(trip);
      const complete=success=>{if(success&&contentChanged)previewBaseline=nextBaseline;resolve(success);};
      window.dispatchEvent(new CustomEvent('travel-shared-preview-change',{detail:{trip:copy(trip),baseline:copy(previewBaseline),editing:Boolean(token),contentChanged,complete}}));
      if(!window.__travelPreviewBridgeReady)complete(true);
    });
  };
  const copy = v => structuredClone(v);
  const hashText = str => {
    let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + ':' + str.length;
  };
  const seed = sharedProject(window.__travelSharedTrip);
  const seedRaw = JSON.stringify(seed);
  const seedSig = hashText(seedRaw);
  const seedBlobs = new Map();
  JSON.stringify(seed, (_, v) => {
    if (typeof v === 'string' && v.length > 1024) seedBlobs.set(hashText(v), v);
    return v;
  });
  // Device drafts must decode independently of a later published HTML seed.
  const packStorage = value => {
    const blobs = {};
    const body = JSON.stringify(value, (k, v) => {
      if (typeof v === 'string' && v.length > 1024) {
        const h = hashText(v);blobs[h] = v;return '__extraBlob:' + h;
      }
      return v;
    });
    return Object.keys(blobs).length ? JSON.stringify({...JSON.parse(body),_blobs:blobs}) : body;
  };
  const unpackStorage = raw => {
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const extra = parsed?._blobs || {};
    return JSON.parse(raw, (k, v) => {
      if (k === '_blobs') return undefined;
      if (typeof v === 'string') {
        if (v.startsWith('__seedBlob:')) { const blob=seedBlobs.get(v.slice(11));if(blob===undefined)throw Error('舊草稿附件需要原發布版本，原始資料已保留。');return blob; }
        if (v.startsWith('__extraBlob:')) { if(!(v.slice(12) in extra))throw Error('草稿附件資料不完整，原始資料已保留。');return extra[v.slice(12)]; }
      }
      return v;
    });
  };
  let previewBaseline = copy(seed);
  const identity = config.repository + ':' + config.branch + ':' + config.path + ':' + seed.tripId;
  const key = 'travel-shared:' + identity, tokenKey = key + ':token';
  const draftStorage=preview?null:createDeviceDraftStorage();
  let token = '', base = copy(seed), trip = copy(seed), envelope = null, dirty = false, busy = false, lastRead = 0, applied = false, savedShared = false, legacyDraft = null;
  let reading=false,deferredSha=null,lastReadError='',storageError='',blockedDraft=false,blockedLegacy=false,baseUnknown=false,hadSharedCache=false;
  if(preview)token=window.__travelPreviewEditing?"preview":"";
  function capture() {
    const state=window.getTravelPreviewState?.();
    if(!state)return;
    if(preview) {
      trip.previewState=state;
      for(const g of trip.packingGroups||[])for(const i of g.items||[])if(i.id in state.packing)i.checked=state.packing[i.id];
    } else {
      trip.previewState={...trip.previewState,expenses:state.expenses};
    }
  }
  if(!preview)try {
    const isEditing = localStorage.getItem(key + ':editing') === '1';
    const exited = sessionStorage.getItem(key + ':exited') === '1';
    token = (isEditing && !exited) ? (localStorage.getItem(tokenKey) || '') : '';
    try { legacyDraft=unpackStorage(await draftStorage.read(key+':legacy')); }
    catch(e){blockedLegacy=true;storageError=e.message;}
    if(legacyDraft && (legacyDraft.base?.tripId!==seed.tripId || legacyDraft.trip?.tripId!==seed.tripId)){blockedLegacy=true;storageError='舊記帳草稿的旅程識別不符，原始資料已保留。';legacyDraft=null;}
    let saved;
    try {
      const raw=await draftStorage.read(key);hadSharedCache=raw!==null;
      const header=raw?JSON.parse(raw):null;
      // A clean cache from an old release is disposable even when its old
      // attachment references cannot be decoded with the current seed.
      saved=header && !header.dirty && header.seedSig!==seedSig ? null : unpackStorage(raw);
    }
    catch(e){blockedDraft=true;storageError=e.message;}
    const sameSeed=saved?.seedSig===seedSig;
    // Only disposable clean caches may be replaced after publication. Dirty
    // drafts keep their original ancestor for three-way merging on refresh.
    if(saved?.dirty && saved.trip?.tripId===seed.tripId) {
      baseUnknown=Boolean(saved.baseUnknown || (!sameSeed&&!saved.base));
      const ancestor=baseUnknown?{}:(saved.base||copy(seed));
      if(baseUnknown||ancestor.tripId===seed.tripId){base=ancestor;trip=saved.trip;dirty=true;savedShared=true;}
      else {blockedDraft=true;storageError='草稿的比較基準不屬於這趟旅程，原始資料已保留。';}
    } else if(saved?.dirty) {
      blockedDraft=true;storageError='草稿的旅程識別不符，原始資料已保留。';
    } else if(sameSeed && (saved.base?.tripId===seed.tripId || !saved.base)) {
      base=saved.base||copy(seed);trip=copy(base);savedShared=true;
    }
  } catch(e) {storageError=e.message;blockedDraft=true;}
  const personalState = window.getTravelPreviewState?.();
  if(!preview && !savedShared && !hadSharedCache && !legacyDraft && !blockedLegacy && personalState && JSON.stringify(personalState.expenses)!==JSON.stringify(window.__travelPublishedPreviewState?.expenses)) {
    const personalTrip=copy(seed);personalTrip.previewState={...personalTrip.previewState,expenses:personalState.expenses};
    legacyDraft={base:copy(seed),trip:personalTrip};
    try{await draftStorage.write(key+':legacy',packStorage(legacyDraft));}catch{storageError='裝置無法保存舊記帳草稿，關閉前請分享記帳與清單備份。';}
  }
  const applyLegacy = async () => {
    if(blockedDraft||blockedLegacy){message(storageError);return false;}
    if(!legacyDraft)return true;
    capture();
    const normalizeExpense=createMobileTransferTools().expense;
    const expenses = value => ({previewState:{expenses:(value?.previewState?.expenses||[]).map(row=>normalizeExpense(row,trip.settings?.homeCurrency))}});
    // Apply only the device's expense changes, including deletions. Concurrent
    // edits use the same explicit conflict choices as all other shared edits.
    const merged=await resolveSharedMerge(expenses(legacyDraft.base),expenses(legacyDraft.trip),expenses(trip),{reading:true});
    if(!merged)return false;
    trip.previewState={...trip.previewState,expenses:merged.previewState.expenses};
    dirty=JSON.stringify(trip)!==JSON.stringify(base);
    if(!await persist())return false;
    legacyDraft=null;
    try{await draftStorage.remove(key+':legacy');}catch{}
    await redraw();return true;
  };
  const client = preview ? null : createSharedClient(config, () => token);
  const style = document.createElement('style');
  style.textContent = `
.shared-dialog{width:calc(100% - 24px);max-width:440px;max-height:85dvh;overflow:auto;border:1px solid #e7d7c7;border-radius:14px;background:#fff;color:#352b23;padding:14px;font-family:inherit;font-size:13.5px;line-height:1.45}
.shared-dialog::backdrop{background:#0007}.shared-dialog h2{font-size:16px;font-weight:600;margin:0 0 12px}.shared-dialog p{margin:8px 0;font-size:13px}.shared-dialog label{display:block;margin:8px 0;color:#655343;font-size:12.5px}
.shared-dialog input:not([type=radio]):not([type=checkbox]),.shared-dialog textarea,.shared-dialog select{display:block;width:100%;min-height:34px;padding:7px 10px;border:1px solid #dec5ae;border-radius:8px;background:#fff;color:#352b23;font-family:inherit;font-size:13.5px!important;font-weight:500;line-height:1.45}
.shared-dialog textarea{min-height:64px;resize:vertical}.shared-dialog input:focus,.shared-dialog textarea:focus,.shared-dialog select:focus{outline:none;border-color:#b54a14}.shared-dialog button{padding:7px 12px;border:1px solid #dec5ae;border-radius:8px;background:#faf6f0;color:#7b6754;font-family:inherit;font-size:13px;line-height:1.4}.shared-dialog button[type=submit]{background:#b54a14;color:#fff;border-color:#b54a14}.shared-dialog button:disabled{opacity:.5}.shared-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.shared-dialog pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:150px;overflow:auto;font-family:inherit;font-size:12px}.shared-dialog fieldset{border:1px solid #e7d7c7;margin:12px 0;min-width:0}
.shared-actions{display:flex;gap:4px;align-items:center;margin:4px 0}.shared-row-actions{flex:0 0 auto;flex-wrap:nowrap;margin:0 0 0 auto!important;align-self:flex-start}.shared-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:#8a6a52;padding:5px;flex:0 0 auto;cursor:pointer}.shared-icon svg{width:16px;height:16px;display:block}.shared-icon:disabled{opacity:.45;cursor:default}.shared-icon:hover{background:#f5ebe1;color:#b54a14}.shared-icon:active{background:#ecdccf}.shared-page-add{justify-content:flex-end}.shared-add-actions{margin-left:auto;justify-content:flex-end}
.note-stop-text .stop-top:has(>.shared-row-actions),[data-shared-reference] .stop-top:has(>.shared-row-actions){display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:flex-start!important;gap:6px!important;width:100%}.place-title-wrap:has(>.shared-row-actions),.flight-airport>span:has(>.shared-row-actions){display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;gap:6px!important;width:100%!important;min-width:0!important}.place-title-wrap:has(>.shared-row-actions)>.place-title,.stop-top:has(>.shared-row-actions)>.place-title-wrap,.stop-top:has(>.shared-row-actions)>.place-title{flex:1 1 0!important;min-width:0!important;max-width:none!important}.place-title-wrap:has(>.shared-row-actions) h3,.stop-top:has(>.shared-row-actions) h3{overflow-wrap:anywhere}.note-stop-content,.note-stop-text,.stop-main,[data-shared-reference]>div:last-child{min-width:0}.pack-item:has(>.shared-row-actions)>span{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}.pack-item:has(>.shared-row-actions){align-items:flex-start}.head-badge-row:has(>.shared-row-actions) h2{flex:1 1 0;min-width:0;overflow-wrap:anywhere}.day-head:has(>.shared-row-actions)>div:first-child{flex:1 1 0;min-width:0}
.hero-tool-stack{display:flex;flex-direction:column;align-items:center;gap:4px;flex:0 0 32px}.shared-editor-bar{display:flex;flex-direction:column;gap:4px}.shared-editor-bar .shared-icon{width:32px;height:32px;padding:6px;border:1px solid #dec5ae;border-radius:8px;background:#fff;color:#7b6754}.shared-editor-bar .shared-icon svg{width:18px;height:18px}.shared-editor-bar .shared-dirty{color:#b54a14;background:#fff7ed;border-color:#d9a078}
.shared-toast{position:fixed;left:50%;bottom:calc(80px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:260;width:max-content;max-width:calc(100% - 32px);padding:8px 12px;border:1px solid #e7d7c7;border-radius:9px;background:#fff;color:#655343;box-shadow:0 3px 16px #0002;font-size:12.5px;line-height:1.45;pointer-events:none}.shared-warning{font-size:12px;color:#92400e;background:#fff7e6;padding:7px 10px;border-radius:8px;margin:6px 0}
.shared-attachment-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}.shared-dialog .shared-file-picker{display:inline-flex;align-items:center;gap:5px;margin:0;padding:6px 10px;border:1px solid #dec5ae;border-radius:8px;background:#faf6f0;color:#7b6754;cursor:pointer;font-size:13px;max-width:100%}.shared-file-picker svg{width:15px;height:15px;flex:none}.shared-file-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px}.shared-dialog .shared-file-picker input[type=file]{display:none!important}.shared-dialog .shared-attachment-remove{padding:6px 8px;font-size:12px;background:transparent}
.shared-dialog.shared-auth{box-sizing:border-box;max-width:360px;padding:16px;text-align:left}.shared-auth-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.shared-auth .shared-auth-header h2{margin:0;font-size:15px!important;line-height:1.4;font-weight:600;letter-spacing:normal}.shared-auth .shared-auth-close{border:0;background:transparent;padding:4px;width:28px;height:28px;display:flex;align-items:center;justify-content:center}.shared-auth-close svg{width:16px;height:16px}.shared-auth .shared-auth-copy{font-size:12.5px!important;line-height:1.6;color:#7b6754;margin:0 0 14px}.shared-auth .shared-auth-token{font-size:12.5px;font-weight:500;margin:0 0 12px}.shared-auth .shared-auth-token input{box-sizing:border-box;margin-top:6px}.shared-auth .shared-auth-remember{display:flex;align-items:center;gap:7px;font-size:12.5px;line-height:1.5;margin:0;font-weight:400}.shared-auth-remember input{appearance:auto;width:14px;height:14px;min-height:0;margin:0;accent-color:#b54a14;flex:none}.shared-auth .shared-auth-status{color:#92400e;font-size:12px;line-height:1.5;margin:10px 0 0}.shared-auth-status:empty{display:none}.shared-auth .shared-form-actions{align-items:center;gap:8px;margin-top:18px}.shared-auth .shared-form-actions button{min-height:34px;font-size:12.5px;white-space:nowrap}.shared-auth [data-remove]{margin-right:auto;border:0;background:transparent;padding:7px 0}.shared-auth [hidden]{display:none!important}
`;
  document.head.append(style);
  const status = document.createElement('span'); status.className = 'shared-toast';status.hidden=true; status.setAttribute('role','status');
  document.body.append(status);
  let toastTimer;
  const message = text => { if(['Up to date','已取得最新共享資料'].includes(text)||text.startsWith('預覽修改已同步')||text.startsWith('Preview changes are in desktop memory')||text.startsWith('變更已暫存')||text.startsWith('Changes saved on this device'))return;status.textContent=text;status.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>status.hidden=true,4200); };
  let draftSaveFailed=false;
  const persist = async () => {
    if(preview)return true;
    if(blockedDraft){message(storageError);return false;}
    const snapshot=packStorage({seedSig,base,baseUnknown,trip:dirty?trip:null,dirty});
    try{await draftStorage.write(key,snapshot);draftSaveFailed=false;return true;}
    catch{draftSaveFailed=true;message(en()?'This device could not save the draft. Keep this page open and share expenses & checklist as a backup.':'裝置無法保存草稿，請保持此頁開啟，先分享記帳與清單備份。');return false;}
  };
  const paths = { addDay:'M3 5h18v16H3ZM7 2v6M17 2v6M3 10h18M12 13v5M9.5 15.5h5', addStop:'M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12ZM12 6v6M9 9h6', add:'M12 5v14M5 12h14', edit:'m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5', delete:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7', save:'M5 3h12l4 4v14H3V3ZM7 3v6h10V3M7 21v-8h10v8', refresh:'M20 7v5h-5M4 17v-5h5M19 12a7 7 0 0 0-12-5M5 12a7 7 0 0 0 12 5', up:'m6 14 6-6 6 6', down:'m6 10 6 6 6-6', check:'m5 12 5 5L20 7' };
  const en = () => document.documentElement.lang === 'en';
  const labels = {"新增注意事項": "Add note", "新增口袋名單": "Add saved place", "新增清單分類": "Add checklist group", "新增準備項目": "Add checklist item", "新增行程地點": "Add stop", "新增日期": "Add day", "往前移": "Move earlier", "往後移": "Move later", "注意事項": "Note", "口袋名單": "Saved place", "清單分類": "Checklist group", "準備項目": "Checklist item", "行程日期": "Day", "行程地點": "Stop", "標題": "Title", "內容": "Content", "連結": "Link", "日期": "Day", "名稱": "Name", "類型": "Type", "分類": "Group", "地址": "Address", "備註": "Notes", "分類名稱": "Group name", "數量": "Quantity", "同行者": "Traveler", "不限日期": "Any day", "共同": "Shared", "景點": "Attraction", "食物": "Food", "美食": "Food", "住宿": "Hotel", "航班": "Flight", "其他": "Other", "抵達時間": "Arrival time", "結束時間": "End time", "Google Maps 連結": "Google Maps link", "官網／訂位連結": "Website / booking link", "開門時間": "Opening time", "關門時間": "Closing time", "入住時間": "Check-in", "退房時間": "Check-out", "航班號": "Flight number", "出發機場": "Departure airport", "抵達機場": "Arrival airport", "起飛時間": "Departure time", "降落時間": "Landing time", "前往下一站方式": "Travel to next stop", "未設定": "Not set", "步行": "Walking", "大眾運輸": "Public transit", "開車": "Driving", "前往下一站時間": "Travel duration", "前往下一站距離": "Travel distance", "取消": "Cancel", "完成": "Done", "完成編輯": "Done editing", "結束編輯": "Exit editing", "清除授權": "Clear token", "編輯授權": "Editing access", "Token 只保存在這台裝置，不會發布到 GitHub。需要目標儲存庫 Contents 寫入權限。": "The token stays on this device. It needs Contents write permission for this repository.", "記住此裝置的授權": "Remember access on this device", "移除授權": "Remove access", "驗證並進入編輯模式": "Verify and enable editing", "儲存共享旅程": "Save shared trip", "同步共享資料": "Sync", "圖片／PDF 附件（單檔最多 2 MB）": "Image / PDF attachment (up to 2 MB)", "移除原附件": "Remove existing attachment"};
  Object.assign(labels,{'內容（支援 [文字](網址) 或直接貼網址）':'Content (supports [text](URL) or pasted links)','備註（支援 [文字](網址) 或直接貼網址）':'Notes (supports [text](URL) or pasted links)','購物':'Shopping','項目':'Item'});
  const t = text => en() ? labels[text] || text : text;
  function setBusy(value){busy=value;document.querySelectorAll('.shared-icon').forEach(b=>b.disabled=busy);guardReadonly();}
  function button(kind, label, action) {
    const b = document.createElement('button'); b.type='button'; b.className='shared-icon';b.disabled=busy; b.title=t(label); b.setAttribute('aria-label', t(label));
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[kind]+'"/></svg>';
    b.onclick=e=>{e.preventDefault();e.stopPropagation();if(!busy)action();}; return b;
  }
  function actions(host, row, list, edit, move = false) {
    if (!host || !token) return;
    const bar=document.createElement('div');bar.className='shared-actions shared-row-actions';
    bar.append(button('edit',en()?'Edit':'編輯',()=>edit(row)),button('delete',en()?'Delete':'刪除',()=>{
      if(confirm(en()?'Delete this item?':'確定刪除這個項目？')) { capture();list.splice(list.indexOf(row),1);if(move)invalidateRoutes(list);if(list===trip.days){trip.startDate=trip.days.map(d=>d.date).filter(Boolean).sort()[0]||'';trip.endDate=trip.days.map(d=>d.date).filter(Boolean).sort().at(-1)||'';for(const e of trip.previewState?.expenses||[])if(e.day===row.id)e.day='day-0';}changed(); }
    }));
    host.append(bar);
  }
  function guardReadonly() {
    window.__travelSharedReadonly=false;
    document.documentElement.classList.toggle('shared-editing',Boolean(token));
    document.querySelectorAll('[data-pack-id]').forEach(b=>b.disabled=busy);
    document.querySelectorAll('.day-expense').forEach(b=>b.hidden=false);
  }
  function exitEditing() { token = ''; if (!preview) { try { localStorage.setItem(key + ':editing', '0'); sessionStorage.setItem(key + ':exited', '1'); } catch {} } notifyPreview(false); controls(); message(en() ? 'Exited editing mode' : '已結束編輯模式'); }
  function controls() {
    document.querySelectorAll('.shared-actions,.shared-editor-bar,.shared-warning').forEach(n=>n.remove());
    guardReadonly();
    const stale = mapSignature(trip)!==mapSignature(seed);
    document.querySelectorAll('.trip-map-shell').forEach(shell=>shell.hidden=stale);
    if(stale && seed.settings?.showMap!==false) {
      const warning=document.createElement('p');warning.className='shared-warning';warning.textContent=en()?'Itinerary changed. Republish maps from the desktop; navigation links remain available.':'行程地點或順序已變更，地圖須由電腦重新發布；仍可使用外部導航。';document.querySelector('.hero')?.append(warning);
    }
    if(!token){window.syncTravelLayout?.();return;}
    const bar=document.createElement('div');bar.className='shared-editor-bar';
    bar.append(button('save',preview?(en()?'Save project':'儲存專案'):(en()?'Save shared trip':'儲存共享旅程'),save));bar.firstChild.classList.toggle('shared-dirty',dirty);
    bar.append(button('check', en() ? 'Done editing' : '完成編輯', exitEditing));
    const fontButton=document.getElementById('text-size-toggle');
    if(fontButton){let stack=fontButton.closest('.hero-tool-stack');if(!stack){stack=document.createElement('div');stack.className='hero-tool-stack';fontButton.replaceWith(stack);stack.append(fontButton);}stack.append(bar);}
    for(const page of document.querySelectorAll('.feature-page')) {
      const add=(label,action)=>{const b=document.createElement('div');b.className='shared-actions shared-page-add';b.append(button('add',label,action));page.prepend(b);};
      if(page.id.startsWith('notes')) {add('新增注意事項',()=>editNote());for(const row of trip.notes||[])actions(page.querySelector('[data-shared-note="'+CSS.escape(row.id)+'"] .note-stop-text .stop-top'),row,trip.notes,editNote,true);}
      if(page.id.startsWith('references')) {add('新增口袋名單',()=>editReference());for(const row of trip.references||[])actions(page.querySelector('[data-shared-reference="'+CSS.escape(row.id)+'"] .stop-top'),row,trip.references,editReference,true);}
      if(page.id.startsWith('packing')) {
        add('新增清單分類',()=>editGroup());
        for(const [index,g] of (trip.packingGroups||[]).entries()) {
          const card=page.querySelector('[id^="pack-group-'+(index+1)+'-"]');if(!card)continue;
          actions(card.querySelector('.day-head'),g,trip.packingGroups,editGroup,true);
          const row=document.createElement('div');row.className='shared-actions shared-add-actions';row.append(button('add','新增準備項目',()=>editPacking(g)));card.append(row);
          for(const i of g.items||[])actions(page.querySelector('[data-pack-id="'+CSS.escape(i.id)+'"]')?.closest('label'),i,g.items,r=>editPacking(g,r),true);
        }
      }
      if(page.id.startsWith('itinerary')) {
        // Keep the day/map region fixed; add buttons live inside each card.
        for(const [index,d] of trip.days.entries()) {
          const card=page.querySelector('[id^="day-'+(index+1)+'-"]');if(!card)continue;
          const head=card.querySelector('.day-head'); actions(head,d,trip.days,editDay,true);
          const row=document.createElement('div');row.className='shared-actions shared-add-actions';row.append(button('addStop','新增行程地點',()=>editStop(d)),button('addDay','新增日期',()=>editDay()));head?.append(row);
          for(const s of d.stops)actions(page.querySelector('[id="preview-stop-'+CSS.escape(s.id)+'"] .place-title-wrap')||page.querySelector('[id="preview-stop-'+CSS.escape(s.id)+'"] .flight-airport>span')||page.querySelector('[id="preview-stop-'+CSS.escape(s.id)+'"] .stop-top')||page.querySelector('[id="preview-stop-'+CSS.escape(s.id)+'"] .flight-airport'),s,d.stops,r=>editStop(d,r),true);
        }
        if(!trip.days.length)add('新增日期',()=>editDay());
      }
    }
    bindSharedDrag();
    window.syncTravelLayout?.();
  }

  function bindSharedDrag() {
    if(!token) return;
    const items = document.querySelectorAll('[data-shared-note], [data-shared-reference], .pack-item, article.stop[id^="preview-stop-"]');
    items.forEach(el => {
      let timer = null, startX = 0, startY = 0, dragging = false;
      const onPointerDown = e => {
        if (e.target.closest('button, a, input, select, textarea, .shared-actions')) return;
        startX = e.clientX; startY = e.clientY;
        dragging = false;
        timer = setTimeout(() => {
          dragging = true;
          startSharedDrag(el);
        }, 350);
      };
      const onPointerMove = e => {
        if (!dragging && (Math.hypot(e.clientX - startX, e.clientY - startY) > 8)) {
          clearTimeout(timer);
        }
      };
      const onPointerEnd = () => clearTimeout(timer);
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', onPointerEnd);
      el.addEventListener('pointercancel', onPointerEnd);
    });
  }

  function startSharedDrag(draggedEl) {
    if (navigator.vibrate) try { navigator.vibrate(30); } catch {}
    draggedEl.classList.add('is-dragging-item');
    const parentContainer = draggedEl.parentNode;

    function onMove(e) {
      if (e.cancelable) e.preventDefault();
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      if (!clientY) return;
      const elUnder = document.elementFromPoint(clientX, clientY);
      if (!elUnder) return;

      const target = elUnder.closest('[data-shared-note], [data-shared-reference], .pack-item, article.stop[id^="preview-stop-"]');
      if (target && target !== draggedEl && target.parentNode === parentContainer) {
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (clientY < midY) {
          parentContainer.insertBefore(draggedEl, target);
        } else {
          parentContainer.insertBefore(draggedEl, target.nextSibling);
        }
      }
    }

    function onEnd() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onEnd);
      document.removeEventListener('pointercancel', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);

      draggedEl.classList.remove('is-dragging-item');

      capture();
      if (draggedEl.hasAttribute('data-shared-note')) {
        const noteIds = [...parentContainer.querySelectorAll('[data-shared-note]')].map(n => n.getAttribute('data-shared-note'));
        trip.notes.sort((a, b) => noteIds.indexOf(a.id) - noteIds.indexOf(b.id));
        changed();
      } else if (draggedEl.hasAttribute('data-shared-reference')) {
        const refIds = [...parentContainer.querySelectorAll('[data-shared-reference]')].map(r => r.getAttribute('data-shared-reference'));
        const currentRefMap = new Map(trip.references.map(r => [r.id, r]));
        const sortedSubset = refIds.map(id => currentRefMap.get(id)).filter(Boolean);
        let subIdx = 0;
        trip.references = trip.references.map(r => refIds.includes(r.id) ? sortedSubset[subIdx++] : r);
        changed();
      } else if (draggedEl.classList.contains('pack-item')) {
        const itemIds = [...parentContainer.querySelectorAll('[data-pack-id]')].map(i => i.getAttribute('data-pack-id'));
        for (const g of trip.packingGroups || []) {
          if (g.items?.some(it => itemIds.includes(it.id))) {
            g.items.sort((a, b) => itemIds.indexOf(a.id) - itemIds.indexOf(b.id));
            break;
          }
        }
        changed();
      } else if (draggedEl.id?.startsWith('preview-stop-')) {
        const stopIds = [...parentContainer.querySelectorAll('article.stop[id^="preview-stop-"]')].map(s => s.id.replace('preview-stop-', ''));
        for (const d of trip.days || []) {
          if (d.stops?.some(s => stopIds.includes(s.id))) {
            d.stops.sort((a, b) => stopIds.indexOf(a.id) - stopIds.indexOf(b.id));
            invalidateRoutes(d.stops);
            break;
          }
        }
        changed();
      }
    }

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('pointercancel', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
  }
  async function redraw() {
    const { buildMobileHtml }=await import('../exporter.js');
    const display=copy(trip);display.previewLanguage=seed.previewLanguage;
    // Existing map shells are preserved by the renderer hook. Never request new online tiles here.
    display.settings={...display.settings,showMap:false};
    const html=buildMobileHtml(display,{sharedPwa:true});
    // Supply the old shells as placeholders so the hook can retain them.
    const parsed=new DOMParser().parseFromString(html,'text/html');
    const oldMaps=[...document.querySelectorAll('#mobile-content .trip-map-shell')];
    parsed.querySelectorAll('.feature-page[id^="itinerary-"]').forEach((page,i)=>{if(oldMaps[i])page.prepend(oldMaps[i].cloneNode(true));});
    window.replaceTravelSharedTrip(trip,parsed.documentElement.outerHTML);
    window.__travelSharedActivityAt=Date.now();applied=true;controls();
  }
  function invalidateRoutes(stops) { for(const stop of stops)stop.nextLeg={...newStop().nextLeg,mode:stop.nextLeg?.mode||''}; }
  async function changed() { dirty=true;setBusy(true);try{const stored=await persist();await redraw();const applied=await notifyPreview(true);if(preview&&!applied){message(en()?'Preview draft kept; desktop changes were not applied.':'預覽草稿仍保留，尚未套用到左側。');return;}if(!stored)return;message(preview?(en()?'Preview changes are in desktop memory. Save the project explicitly.':'預覽修改已同步到左側，按外側「儲存專案」才會寫檔。'):(en()?'Changes saved on this device. Tap Save to share.':'變更已暫存於此裝置，按「儲存共享旅程」才會同步。'));}catch(e){message('草稿已保留，畫面更新失敗：'+e.message);}finally{setBusy(false);} }
  function form(title, fields, initial, submit, attachment=false) {
    const dialog=document.createElement('dialog');dialog.className='shared-dialog';const h=document.createElement('h2');h.textContent=t(title);dialog.append(h);
    const f=document.createElement('form');dialog.append(f);const inputs={};const comboboxBindings=[];
    for(const [name,label,type='text',options] of fields) {
      const l=document.createElement('label');l.append(document.createTextNode(t(label)));const input=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');
      if(type==='combobox'){input.type='text';const list=document.createElement('datalist');list.id='shared-options-'+name;for(const value of options){const option=document.createElement('option');option.value=value;option.label=categoryDisplayText(value);list.append(option);}f.append(list);comboboxBindings.push(()=>bindCategoryCombobox(input,options,{formatLabel:v=>categoryDisplayText(v,en()?'en':'zh')}));}else if(type==='select')for(const [value,text] of options){const o=document.createElement('option');o.value=value;o.textContent=t(text);input.append(o);}else if(type!=='textarea')input.type=type;
      if(type==='select'&&initial[name]&&!Array.from(input.options).some(o=>o.value===String(initial[name]))){const old=document.createElement('option');old.value=String(initial[name]);old.textContent=String(initial[name]);input.append(old);}input.name=name;input.value=initial[name]??'';if(name==='content')input.placeholder=t('內容（支援 [文字](網址) 或直接貼網址）');if(name==='note')input.placeholder=t('備註（支援 [文字](網址) 或直接貼網址）');if(type==='combobox')input.placeholder=en()?'Choose or enter a category':'選擇或輸入分類';if(name==='quantity'){input.min='1';input.step='1';input.inputMode='numeric';}if(type==='url')input.pattern='https?://.*';l.append(input);f.append(l);inputs[name]=input;
    }
    let file=null, removeAttachment=false;
    if(attachment){
      const row=document.createElement('div');row.className='shared-attachment-row';
      const label=document.createElement('label');label.className='shared-file-picker';label.tabIndex=0;label.title=en()?'Large images compress at original resolution; PDFs up to 2 MB':'大圖片自動壓縮，保留原解析度；PDF 最多 2 MB';
      label.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 11-8 8a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8l8-8"/></svg>';
      const name=document.createElement('span');name.className='shared-file-name';name.textContent=en()?'Attachment':'附檔';label.append(name);
      const input=document.createElement('input');input.type='file';input.hidden=true;input.accept='image/*,application/pdf';input.onchange=()=>{file=input.files[0]||null;name.textContent=file?.name||(en()?'Attachment':'附檔');};label.append(input);label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};row.append(label);
      if(initial.image){const remove=document.createElement('button');remove.type='button';remove.className='shared-attachment-remove';remove.textContent=t('移除原附件');remove.onclick=()=>{removeAttachment=true;remove.disabled=true;remove.textContent=en()?'Will remove':'已標記移除';};row.append(remove);}
      f.append(row);const hint=document.createElement('p');hint.className='shared-attachment-help';hint.style.color='#7b6754';hint.style.fontSize='12px';hint.textContent=en()?'Large images compress at original resolution; PDFs up to 2 MB.':'大圖片自動壓縮，保留原解析度；PDF 最多 2 MB。';f.append(hint);
    }
    const error=document.createElement('p');error.className='shared-warning';error.hidden=true;f.append(error);
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent=t('取消');cancel.onclick=()=>{dialog.close();dialog.remove();};
    const ok=document.createElement('button');ok.type='submit';ok.textContent=t('完成');const footer=document.createElement('div');footer.className='shared-form-actions';footer.append(cancel,ok);f.append(footer);
    f.onsubmit=async e=>{e.preventDefault();ok.disabled=true;cancel.disabled=true;error.hidden=true;try{const data=Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value.trim()]));if(removeAttachment)data.image=null;if(file){ok.textContent=en()?'Processing…':'處理中…';data.image={id:crypto.randomUUID(),...await readAttachment(file,{language:en()?'en':'zh'})};}capture();submit(data);dialog.close();dialog.remove();await changed();}catch(e){error.hidden=false;error.textContent=e.message;}finally{ok.disabled=false;cancel.disabled=false;ok.textContent=t('完成');}};
    document.body.append(dialog);dialog.onclose=()=>{dialog.querySelectorAll('.category-combobox-input').forEach(el=>el.dispatchEvent(new Event('category-combobox-dispose')));dialog.remove();};dialog.oncancel=e=>{if(ok.disabled)e.preventDefault();};dialog.showModal();comboboxBindings.forEach(fn=>fn());
  }
  const put=(list,row,data,defaults)=>{if(row)Object.assign(row,data);else list.push({...defaults(),...data});};
  const dayOptions=()=>[['','不限日期'],...trip.days.map((d,i)=>[d.id,'D'+(i+1)+' '+d.date])];
  function editNote(row){form('注意事項',[['title','標題'],['content','內容','textarea']],row||{},data=>{if(!data.title&&!data.content)throw Error('請填標題或內容。');put(trip.notes,row,data,newNote);},true);}
  function editReference(row){form('口袋名單',[['kind','分類','combobox',referenceSuggestions(trip.references||[])],['name','名稱'],['note','備註','textarea']],row?{...row,kind:referenceCategory(row)}:{kind:''},data=>{if(!data.name)throw Error('請填名稱。');if(row&&data.name!==row.name){row.website='';row.address='';row.autoLookupState='';}data.kind=data.kind||'景點';if(!row||referenceCategory(row)!==data.kind)data.group=data.kind;put(trip.references,row,data,newReference);},true);}
  function editGroup(row){form('清單分類',[['title','分類名稱']],row||{},data=>{if(!data.title)throw Error('請填分類名稱。');put(trip.packingGroups,row,data,newPackingGroup);});}
  function editPacking(group,row){form('準備項目',[['text','項目'],['quantity','數量','number']],row||{quantity:1},data=>{if(!data.text||Number(data.quantity)<1)throw Error('請填內容及有效數量。');data.quantity=Number(data.quantity);put(group.items,row,data,newPackingItem);});}
  function editDay(row){form('行程日期',[['date','日期','date'],['title','標題']],row||{},data=>{if(!data.date)throw Error('請選日期。');put(trip.days,row,data,()=>({...newDay(),stops:[]}));trip.startDate=trip.days.map(d=>d.date).filter(Boolean).sort()[0]||'';trip.endDate=trip.days.map(d=>d.date).filter(Boolean).sort().at(-1)||'';});}
  function editStop(day,row){
    const fields=[['kind','類型','select',['景點','食物','住宿','航班','其他'].map(v=>[v,v])],['name','名稱'],['time','抵達時間'],['endTime','結束時間'],['address','地址'],['googleMaps','Google Maps 連結','url'],['website','官網／訂位連結','url'],['offlineNote','備註','textarea'],['openTime','開門時間'],['closeTime','關門時間'],['checkIn','入住時間'],['checkOut','退房時間'],['flightNumber','航班號'],['departureAirport','出發機場'],['arrivalAirport','抵達機場'],['departureTime','起飛時間'],['arrivalTime','降落時間'],['mode','前往下一站方式','select',[['','未設定'],['步行','步行'],['大眾運輸','大眾運輸'],['開車','開車'],['其他','其他']]],['duration','前往下一站時間'],['distance','前往下一站距離']];
    form('行程地點',fields,{...row,googleMaps:row?.links?.googleMaps||'',mode:row?.nextLeg?.mode||'',duration:row?.nextLeg?.duration||'',distance:row?.nextLeg?.distance||''},data=>{
      if(!data.name)throw Error('請填地點名稱。');const s=row||newStop();
      const placeChanged=['name','address','kind','departureAirport','arrivalAirport'].some(k=>data[k]!==s[k])||data.googleMaps!==(s.links?.googleMaps||'');
      const {googleMaps,mode,duration,distance,...rest}=data;
      if(placeChanged){s.location=null;s.lookupStatus='';s.lastPlaceLookup='';s.placeResolution=null;s.lookupVerification={};s.autoValues={};s.autoFields={};s.lookupEvidence={place:[],flight:[],route:[]};s.nextLeg={...newStop().nextLeg};const index=day.stops.indexOf(s);if(index>0)day.stops[index-1].nextLeg={...newStop().nextLeg,mode:day.stops[index-1].nextLeg?.mode||''};}
      for(const [k,v] of Object.entries(rest))if(s[k]!==v){s.manualFields||={};s.manualFields[k]=true;}Object.assign(s,rest);s.links={...s.links,googleMaps};s.nextLeg={...s.nextLeg,mode,duration,distance};if(!row){if(day.stops.length){const previous=day.stops.at(-1);previous.nextLeg={...newStop().nextLeg,mode:previous.nextLeg?.mode||''};}day.stops.push(s);}
    },true);
  }
  async function refresh(manual=false) {
    if(preview)return;
    if(busy||reading||document.hidden||document.querySelector('.shared-dialog[open],#global-expense-modal.active')||(!manual&&Date.now()-lastRead<(token?120000:300000)))return;
    reading=true;lastRead=Date.now();let locked=false;
    const lock=value=>{document.querySelectorAll('#mobile-content,.hero,.feature-nav').forEach(node=>node.inert=value);};
    try{
      const latest=await client.read();assertShared(latest.value,seed.tripId);envelope=latest.value;
      if(busy)return;
      lastReadError='';
      if(document.querySelector('.shared-dialog[open],#global-expense-modal.active')){lastRead=0;return;}
      window.__travelSharedReadAt=Date.now();
      if(!manual&&deferredSha===latest.sha)return;
      const latestSeedRaw=JSON.stringify(latest.value.seed);
      if(hashText(latestSeedRaw)!==seedSig && JSON.stringify(latest.value.trip)===latestSeedRaw){if(!applied){window.applyTravelSharedState?.(trip);applied=true;}return;}
      if(JSON.stringify(base)===JSON.stringify(latest.value.trip)){if(!applied){window.applyTravelSharedState?.(trip);applied=true;}return;}
      if(!dirty){
        const changed=JSON.stringify(trip)!==JSON.stringify(latest.value.trip);
        base=copy(latest.value.trip);baseUnknown=false;trip=copy(latest.value.trip);dirty=false;deferredSha=null;await persist();
        if(changed)await redraw();else{if(!applied){window.applyTravelSharedState?.(trip);applied=true;}controls();}
        return;
      }
      capture();
      setBusy(true);locked=true;lock(true);message(en()?'Shared changes found. Updating and merging…':'發現共享變更，正在更新與合併…');
      const merged=await resolveSharedMerge(base,trip,latest.value.trip,{reading:true});
      if(!merged){deferredSha=latest.sha;message(en()?'Update postponed. Your draft is kept; Save will check again.':'已暫緩共享更新，草稿仍保留；按儲存會再次核對。');return;}
      const changed=JSON.stringify(trip)!==JSON.stringify(merged);base=copy(latest.value.trip);baseUnknown=false;trip=copy(merged);dirty=JSON.stringify(trip)!==JSON.stringify(base);deferredSha=null;await persist();
      if(changed)await redraw();else controls();
      message(en()?'Shared changes merged. Your unsaved edits are kept.':'共享更新已合併，自己的未儲存修改仍保留。');
    }catch(e){const reason=navigator.onLine?e.message:'目前離線，保留裝置上的資料。';if(lastReadError!==reason){lastReadError=reason;message(reason);}}finally{reading=false;if(locked){lock(false);setBusy(false);}}
  }
  async function save() {
    if(busy||!token)return;capture();if(!preview){setBusy(true);try{if(!await applyLegacy())return;}finally{setBusy(false);}}if(preview){setBusy(true);try{if(!await notifyPreview(true))return;const saved=await new Promise(resolve=>window.dispatchEvent(new CustomEvent('travel-shared-preview-save',{detail:{complete:resolve}})));if(saved){dirty=false;controls();message(en()?'Project saved':'專案已儲存');}}finally{setBusy(false);}return;}dirty=true;setBusy(true);await persist();
    try {
      let candidate=copy(trip), ancestor=copy(base);
      for(let attempt=0;attempt<3;attempt++){
        const latest=await client.read();assertShared(latest.value,seed.tripId);
        const merged=await resolveSharedMerge(ancestor,candidate,latest.value.trip);if(!merged){message('已取消，草稿仍保留。');return;}
        const next={...latest.value,trip:sharedProject(merged),updatedAt:new Date().toISOString()};
        try {await client.write(next,latest.sha);base=copy(next.trip);baseUnknown=false;trip=copy(base);envelope=next;dirty=false;deferredSha=null;legacyDraft=null;try{await draftStorage.remove(key+':legacy');}catch{}await persist();await redraw();message(en()?'Shared trip saved':'共享旅程已儲存，其他人連網更新後可看到');return;}
        catch(e){if(e.status!==409&&e.status!==422)throw e;ancestor=copy(latest.value.trip);candidate=merged;}
      }
      throw Error('其他人持續修改，請稍後再按儲存；草稿仍保留。');
    }catch(e){message(e.message+' 草稿仍保留，可重試。');}finally{setBusy(false);controls();}
  }
  function authorization() {
    if(document.querySelector('.shared-dialog[open]'))return;
    const d=document.createElement('dialog');d.className='shared-dialog shared-auth';
    const text=(zh,english)=>en()?english:zh;
    const remembered=(!preview?localStorage.getItem(tokenKey):'')||'';
    d.innerHTML='<div class="shared-auth-header"><h2>'+text('編輯模式','Editing mode')+'</h2><button type="button" class="shared-auth-close" data-close aria-label="'+t('取消')+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><p class="shared-auth-copy">'+text('手機需輸入具有 Contents 寫入權限的 Token；電腦預覽可留空直接進入。Token 不會放入旅程或發布檔。','On your phone, enter a token with Contents write permission. Desktop preview can leave it blank. The token is never included in trip or published files.')+'</p><form><label class="shared-auth-token">GitHub Token<input name="token" type="password" placeholder="'+(remembered?text('已記住授權（留空直接使用）','Token remembered (leave blank to use)'):text('貼上 Token','Paste token'))+'" autocomplete="off" autocapitalize="off" spellcheck="false"></label><label class="shared-auth-remember"><input name="remember" type="checkbox" checked>'+t('記住此裝置的授權')+'</label><p class="shared-auth-status" role="status" aria-live="polite"></p><div class="shared-form-actions"><button type="button" data-forget'+(remembered&&!preview?'':' hidden')+'>'+text('清除授權','Clear token')+'</button><button type="button" data-remove'+(token?'':' hidden')+'>'+text('結束編輯','End editing')+'</button><button type="button" data-cancel>'+t('取消')+'</button><button type="submit">'+text('進入編輯模式','Enter editing mode')+'</button></div></form>';
    document.body.append(d);d.showModal();d.onclose=()=>{d.querySelector('[name=token]').value='';d.remove();};
    d.querySelector('[data-close]').onclick=d.querySelector('[data-cancel]').onclick=()=>d.close();
    d.querySelector('[data-remove]').onclick=()=>{exitEditing();d.close();};
    const forgetBtn=d.querySelector('[data-forget]');if(forgetBtn)forgetBtn.onclick=()=>{try{localStorage.removeItem(tokenKey);localStorage.setItem(key+':editing','0');}catch{}exitEditing();d.close();message(text('已清除本機記住的授權','Remembered token cleared'));};
    d.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target;if(preview){token='preview';controls();notifyPreview(false);d.close();return;}const entered=(f.elements.token.value.trim()||remembered),b=f.querySelector('[type=submit]');if(!entered){f.querySelector('[role=status]').textContent=text('請先輸入 GitHub Token。','Enter your GitHub token first.');f.elements.token.focus();return;}b.disabled=true;
      try{const response=await fetch('https://api.github.com/repos/'+config.repository,{headers:{Authorization:'Bearer '+entered,Accept:'application/vnd.github+json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('Token 驗證失敗，請檢查授權。');const repo=await response.json();if(!repo.permissions?.push)throw Error('這份授權沒有儲存庫寫入資格。');token=entered;try{localStorage.setItem(key+':editing','1');sessionStorage.removeItem(key+':exited');}catch{}try{if(f.elements.remember.checked)localStorage.setItem(tokenKey,token);else localStorage.removeItem(tokenKey);}catch{message('授權只暫留於此頁，裝置無法記住 Token。');}f.elements.token.value='';d.close();setBusy(true);let merged=false;try{merged=await applyLegacy();}finally{setBusy(false);}controls();if(merged)await refresh(true);}catch(e){f.querySelector('[role=status]').textContent=e.message;}finally{b.disabled=false;}};
  }
  let taps=0,lastTap=0,lastTarget='';
  document.addEventListener('click',e=>{
    if(!e.isTrusted)return;
    const nav=e.target.closest('[data-feature-target]');if(!nav){taps=0;return;}const target=nav.dataset.featureTarget;
    requestAnimationFrame(guardReadonly);
    if(!/^packing-/.test(target)){taps=0;return;}
    const now=Date.now();taps=target===lastTarget&&now-lastTap<1500?taps+1:1;lastTarget=target;lastTap=now;
    if(taps===5){taps=0;authorization();}
  },true);
  document.addEventListener('click',e=>{if(busy&&e.target.closest('.day-expense,.rrow,.expense-delete-btn,[data-pack-id]')){e.preventDefault();e.stopImmediatePropagation();}},true);
  window.addEventListener('travel-preview-change',async()=>{
    // Expenses are editable before authorization too. Keep that device draft
    // before a refresh, authorization, or reload can replace the rendered state.
    const before=JSON.stringify(trip);
    capture();
    if(JSON.stringify(trip)===before)return;
    dirty=JSON.stringify(trip)!==JSON.stringify(base);await persist();controls();
  });
  window.addEventListener('online',()=>refresh(true));document.addEventListener('visibilitychange',()=>refresh());window.addEventListener('focus',()=>refresh());
  window.addEventListener('beforeunload',e=>{if(dirty&&!preview){e.preventDefault();e.returnValue='';}});
  if(!preview)setInterval(()=>refresh(),60000);
  window.__travelSharedController={save,refresh,authorization,get trip(){return copy(trip);},get dirty(){return dirty;},get updating(){return busy||reading||Boolean(draftStorage?.pending);},get legacyPending(){return Boolean(legacyDraft)||blockedLegacy||blockedDraft||draftSaveFailed;},projectSaved(){if(preview){dirty=false;controls();}}};
  await persist();
  if(JSON.stringify(trip)!==JSON.stringify(seed))await redraw();else controls();
  if(storageError)message(storageError);
  if(token&&legacyDraft){setBusy(true);try{if(!await applyLegacy())return;}finally{setBusy(false);}}
  await refresh(true);
}

if(document.querySelector('meta[name="travel-pwa"]')) {
  const config=document.getElementById('travel-shared-config');
  if(config)installSharedRuntime(JSON.parse(config.textContent)).catch(()=>{});
}

if(window.__travelPreviewReady)installSharedRuntime({preview:true}).catch(()=>{});
