// Embedded as a function in exported HTML, so sharing needs no external script.
export function installMobileShare({ tools, trip, baseline, readState }) {
  let busy = false;
  async function share(button) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    const en = button.dataset.language === 'en';
    try {
      const text = tools.markdown(trip, baseline(), readState());
      const filename = (trip.title || 'trip').replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 80) + '-mobile.md';
      const file = new File([text], filename, { type: 'text/markdown' });
      // Some mobile browsers only allow .txt text attachments. Content stays Markdown.
      const plainFile = new File([text], filename + '.txt', { type: 'text/plain' });
      const shareFile = navigator.canShare?.({ files: [file] }) ? file : navigator.canShare?.({ files: [plainFile] }) ? plainFile : null;
      if (navigator.share && shareFile) {
        try { await navigator.share({ files: [shareFile], title: trip.title || 'Travel Planner' }); return; }
        catch (error) { if (error.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(file), link = document.createElement('a');
      link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      alert(en ? 'MD downloaded. Send this file to your computer and choose Import mobile MD.' : '已下載 MD。請將此檔案傳到電腦，再選「匯入手機 MD」。');
    } catch (error) {
      alert((en ? 'Unable to share: ' : '無法分享：') + error.message);
    } finally { busy = false; button.disabled = false; }
  }
  return function mount() {
    document.querySelectorAll('#mobile-content .feature-page').forEach(page => {
      if (!/^expenses-/.test(page.id) || page.querySelector('.mobile-share')) return;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'mobile-share';
      button.dataset.language = page.id.endsWith('-en') ? 'en' : 'zh';
      button.textContent = button.dataset.language === 'en' ? 'Share expenses & checklist' : '分享記帳與清單';
      button.style.cssText = 'display:block;margin:12px 0;padding:8px 12px;border:1px solid #d7b99f;border-radius:9px;background:#fff;color:#9a431a;font:inherit;font-size:13px;max-width:100%';
      button.onclick = () => share(button);
      page.append(button);
    });
  };
}
