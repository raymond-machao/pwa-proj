// Full trip drafts (including attachments) exceed Web Storage's small quota.
// Keep them in IndexedDB; localStorage is read only for older PWA migrations.
export function createDeviceDraftStorage({database=()=>indexedDB,legacyStorage=()=>localStorage}={}) {
  let opening=null,queue=Promise.resolve(),pending=0;
  function open() {
    if(!opening)opening=new Promise((resolve,reject)=>{
      const request=database().open('travel-device-drafts',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(Error('裝置草稿儲存正在被其他頁面使用，請稍後再試。'));
    }).catch(error=>{opening=null;throw error;});
    return opening;
  }
  async function transaction(mode,action) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts',mode);
      let value;
      const request=action(tx.objectStore('drafts'));
      request.onsuccess=()=>{value=request.result;};
      tx.oncomplete=()=>resolve(value);
      tx.onabort=()=>reject(tx.error||request.error||Error('裝置未完成保存草稿。'));
      tx.onerror=()=>{}; // onabort reports the final failure, never a partial write.
    });
  }
  function write(key,value) {
    pending++;
    const task=queue.then(async()=>{
      await transaction('readwrite',store=>store.put(value,key));
      // Remove only this migrated entry, and only after the IDB commit succeeds.
      try{legacyStorage().removeItem(key);}catch{}
    });
    queue=task.catch(()=>{});
    return task.finally(()=>pending--);
  }
  return {
    get pending(){return pending>0;},
    async read(key) {
      await queue;
      try {
        const value=await transaction('readonly',store=>store.get(key));
        if(value!==undefined)return value;
      }catch { /* Older local drafts remain readable if IndexedDB is unavailable. */ }
      return legacyStorage().getItem(key);
    },
    write,
    // A tombstone prevents a failed localStorage cleanup from resurrecting data.
    remove:key=>write(key,null),
  };
}
