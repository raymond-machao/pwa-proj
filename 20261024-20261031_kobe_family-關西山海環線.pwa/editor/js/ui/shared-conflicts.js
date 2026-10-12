import { mergeShared } from '../domain/shared-trip.js';

export async function resolveSharedMerge(base, local, remote, {reading=false} = {}) {
  const first = mergeShared(base, local, remote);
  if (!first.conflicts.length) return first.trip;
  return new Promise(resolve => {
    const en = document.documentElement.lang === 'en';
    const dialog = document.createElement('dialog'); dialog.className = 'shared-dialog';
    const title = document.createElement('h2'); title.textContent = en ? 'Conflicting edits' : '同一份內容有不同修改';
    const intro = document.createElement('p'); intro.textContent = en ? 'Other changes merge automatically. Choose each conflicting value. Cancel keeps your draft.' : '其他項目會自動合併。請逐項選擇要保留的內容；取消會保留你的草稿。';
    dialog.append(title, intro);
    const choices = {};
    const valueText = v => v === undefined ? (en ? '(Deleted)' : '（已刪除）') : typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    const apply = document.createElement('button'); apply.textContent = reading ? (en ? 'Apply merge' : '套用合併') : (en ? 'Merge and save' : '合併並繼續儲存'); apply.disabled = true;
    first.conflicts.forEach((conflict, index) => {
      const field = document.createElement('fieldset'), legend = document.createElement('legend'); const names = en ? {notes:'Notes',references:'Saved places',days:'Days',stops:'Stops',packingGroups:'Checklists',items:'Items',previewState:'Phone data',expenses:'Expenses',packing:'Checks',title:'Title',content:'Content',name:'Name',time:'Time',amount:'Amount',checked:'Checked',text:'Text',note:'Notes',順序:'Order'} : {notes:'注意事項',references:'口袋名單',days:'行程日期',stops:'地點',packingGroups:'行前準備',items:'項目',previewState:'手機資料',expenses:'記帳',packing:'勾選',title:'標題',content:'內容',name:'名稱',time:'時間',amount:'金額',checked:'勾選',text:'內容',note:'備註',順序:'順序'};
      let values=[base,local,remote];const parts=[];
      for(const key of conflict.path.split('/').filter(Boolean)) {
        if(key.startsWith('@')) { values=values.map(v=>Array.isArray(v)?v.find(row=>row.id===key.slice(1)):undefined);const row=values.find(Boolean);parts.push(row?.title||row?.name||row?.text||row?.description||row?.date||(en?'Item':'項目')); }
        else { values=values.map(v=>v?.[key]);parts.push(names[key]||((local.packingGroups||[]).flatMap(g=>g.items||[]).find(i=>i.id===key)?.text)||key); }
      }
      legend.textContent = parts.join(' / ');
      field.append(legend);
      for (const [key, label] of [['local', en ? 'My edit' : '我的修改'], ['remote', en ? 'Shared version' : '目前共享版本']]) {
        const row = document.createElement('label'), radio = document.createElement('input'), text = document.createElement('span'), pre = document.createElement('pre');
        radio.type = 'radio'; radio.name = 'conflict-' + index; text.textContent = label; pre.textContent = valueText(conflict[key]);
        row.append(radio, text, pre); field.append(row);
        radio.onchange = () => { choices[conflict.path] = key; apply.disabled = Object.keys(choices).length !== first.conflicts.length; };
      }
      dialog.append(field);
    });
    const cancel = document.createElement('button'); cancel.textContent = en ? 'Cancel' : '取消'; cancel.type = 'button';
    const finish = value => { dialog.close(); dialog.remove(); resolve(value); };
    cancel.onclick = () => finish(null); dialog.oncancel = e => { e.preventDefault(); finish(null); };
    apply.onclick = () => finish(mergeShared(base, local, remote, choices).trip);
    dialog.append(cancel, apply); document.body.append(dialog); dialog.showModal();
  });
}
