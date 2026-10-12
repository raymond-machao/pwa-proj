// Shared by the desktop editor and scope-local PWA; never uploads the original.
export const ATTACHMENT_MAX_BYTES = 2_000_000;

const inferredTypes = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',heic:'image/heic',heif:'image/heif',bmp:'image/bmp',svg:'image/svg+xml',pdf:'application/pdf'};

export async function readAttachment(file, {language='zh'} = {}) {
  if (!file) return null;
  const text = (zh,en) => language === 'en' ? en : zh;
  const mimeType = file.type || inferredTypes[file.name.split('.').pop().toLowerCase()] || '';
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  if (!isImage && !isPdf) throw Error(text('請選擇圖片檔或 PDF 檔。','Choose an image or PDF file.'));
  if (isPdf && file.size > ATTACHMENT_MAX_BYTES) throw Error(text('PDF 超過 2 MB，請先縮小檔案。','PDF exceeds 2 MB. Reduce the file size first.'));

  let result = file;
  if (isImage && file.size > ATTACHMENT_MAX_BYTES) result = await compressImage(file,text);
  const dataUrl = await new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error(text('無法讀取附檔，請重新選擇。','Unable to read attachment. Choose it again.')));
    reader.readAsDataURL(result);
  });
  const type = result.type || mimeType;
  const extension = { 'image/webp':'webp', 'image/png':'png', 'image/jpeg':'jpg' }[type];
  const name = result === file ? file.name : file.name.replace(/\.[^.]+$/, '') + '.' + extension;
  return {name,mimeType:type,size:result.size,dataUrl};
}

async function compressImage(file,text) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement('canvas');
  try {
    await new Promise((resolve,reject) => {
      image.onload = resolve;
      image.onerror = () => reject(Error(text('無法讀取這種圖片格式，請改選 JPG、PNG 或 WebP。','Unable to read this image format. Choose JPG, PNG or WebP.')));
      image.src = url;
    });
    // Image decoding applies the phone's EXIF orientation; retain every pixel.
    const context = canvas.getContext('2d');
    if (!context || !image.naturalWidth || !image.naturalHeight) throw Error(text('此裝置無法處理圖片。','This device cannot process images.'));
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image,0,0);
    // Prefer the highest quality that fits; keep transparency and original dimensions.
    // Unsupported WebP encoders fall back to PNG, whose quality cannot be adjusted.
    for (const quality of [.9,.82,.74,.66,.58,.5,.42]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/webp',quality));
      if (!blob) throw Error(text('圖片壓縮失敗，請重新選擇。','Image compression failed. Choose it again.'));
      if (blob.size <= ATTACHMENT_MAX_BYTES) return blob;
      if (blob.type === 'image/png') break;
    }
    throw Error(text('保留原解析度壓縮後仍超過 2 MB，請改選其他圖片；未自動縮小解析度。','Image still exceeds 2 MB at its original resolution. Choose another image; resolution was not reduced.'));
  } finally {
    URL.revokeObjectURL(url);
    image.src = '';
    canvas.width = canvas.height = 0;
  }
}
