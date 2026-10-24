export const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
export const uid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
export const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const clock = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(n => n[0] || '').join('').toUpperCase() || 'PC';
export const isValidHttpUrl = (value) => {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
};
export const safeHref = (value) => isValidHttpUrl(value) ? esc(value) : '#';
export const niceNumber = (n) => Intl.NumberFormat('en-IN').format(n || 0);
export function youtubeEmbed(url) {
  if (!isValidHttpUrl(url)) return null;
  try {
    const uri = new URL(url);
    const host = uri.hostname.toLowerCase();
    let id = '';
    if (host === 'youtu.be' || host === 'www.youtu.be') id = uri.pathname.split('/')[1];
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      id = uri.searchParams.get('v') || uri.pathname.match(/^\/(?:embed|live|shorts)\/([^/]+)/)?.[1];
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}
export async function compressPhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image must be under 10 MB.');
  const blobUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = blobUrl;
    await image.decode();
    const ratio = Math.min(1, 1100 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is unsupported.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/jpeg', 0.74);
    for (const q of [0.6, 0.48, 0.38]) {
      if (data.length * .75 < 100 * 1024) break;
      data = canvas.toDataURL('image/jpeg', q);
    }
    return { data, kb: Math.round(data.length * .75 / 1024) };
  } finally { URL.revokeObjectURL(blobUrl); }
}
