import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
export const uuid = () => randomUUID();
export const cleanText = (input, max = 500) => typeof input === 'string' ? input.trim().slice(0, max) : '';
export const required = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
export const strongPassword = p => typeof p === 'string' && p.length >= 12 && p.length <= 128;
export const emailValid = e => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const compareSecret = (a, b) => {
  if (!a || !b) return false;
  const aa = createHash('sha256').update(String(a)).digest();
  const bb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(aa, bb);
};
export function allowedLink(url) {
  if (typeof url !== 'string' || url.length > 2048) return false;
  try { const parsed = new URL(url); return parsed.protocol === 'https:' || (process.env.ALLOW_LOCAL_HTTP_URLS === 'true' && parsed.protocol === 'http:'); }
  catch { return false; }
}
export function cloudPhotoUrl(url, cloud) {
  if (!allowedLink(url) || !cloud) return false;
  try { const p = new URL(url); return p.hostname === 'res.cloudinary.com' && p.pathname.startsWith(`/${cloud}/image/upload/`) && p.pathname.includes('/punit-classes/doubts/'); }
  catch { return false; }
}
export function scoreQuiz(qs, answers) {
  return qs.reduce((score,q,i) => !(String(i) in answers) ? score : score + (Number(answers[i]) === Number(q.correct) ? 4 : -1), 0);
}
export function rank(list) { return list.sort((a,b) => b.score - a.score || a.$createdAt?.localeCompare(b.$createdAt || '') || 0); }
export function appwriteCookieHeaders(responseHeaders, secure = false) {
  const headers = responseHeaders.getSetCookie?.() || [];
  return headers.filter(line => /^a_session_[^=]+=/.test(line)).map(line => {
    const parts = line.split(';').map(x => x.trim());
    const nameValue = parts[0];
    const expire = parts.find(x => /^expires=/i.test(x));
    const maxAge = parts.find(x => /^max-age=/i.test(x));
    return [nameValue, 'Path=/', 'HttpOnly', 'SameSite=Lax', ...(secure ? ['Secure'] : []), ...(expire ? [expire] : []), ...(maxAge ? [maxAge] : [])].join('; ');
  });
}
export function clearCookies(cookieString = '', secure = false) {
  return cookieString.split(';').map(x => x.trim().split('=')[0]).filter(x => /^a_session_[a-zA-Z0-9_]+$/.test(x)).map(x => `${x}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`);
}
export function shaId(value) { return createHash('sha256').update(value).digest('hex').slice(0,36); }
export function sendJSON(res, status, body, headers = {}) { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...headers }); res.end(JSON.stringify(body)); }
export class HttpError extends Error { constructor(status,message) { super(message); this.status=status; } }
export function assert(condition, status, message) { if (!condition) throw new HttpError(status,message); }
export function rateLimiter({ windowMs = 60_000, limit = 35 } = {}) {
  const states = new Map();
  return (key) => {
    const now = Date.now();
    if (states.size > 20_000) for (const [id,s] of states) if (s.until <= now) states.delete(id);
    let s = states.get(key);
    if (!s || s.until <= now) { s = { count:0, until:now+windowMs }; states.set(key,s); }
    s.count++;
    return s.count <= limit;
  };
}
