import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApi } from './api.mjs';
import { HttpError, sendJSON } from './security.mjs';
const root = path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon', '.json':'application/json', '.woff2':'font/woff2' };
export function createServer(env = process.env, api = createApi(env)) {
  return http.createServer(async (req,res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const origin = req.headers.origin;
    const isMutation = !['GET','HEAD','OPTIONS'].includes(req.method);
    const secure = env.NODE_ENV === 'production';
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if (secure) res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
    // Existing template uses inline style attributes and Youtube iframe embeds.
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com; media-src 'self' https://res.cloudinary.com https://*.googlevideo.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self' https://api.cloudinary.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    try {
      if (pathname.startsWith('/api/')) {
        if (isMutation) {
          if (req.headers['x-punit-csrf'] !== '1') throw new HttpError(403,'Missing request protection header.');
          const allowedOrigin = env.APP_ORIGIN || `${secure?'https':'http'}://${req.headers.host}`;
          if (origin && origin !== allowedOrigin) throw new HttpError(403,'Origin not permitted.');
          if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403,'Cross-site request blocked.');
          if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415,'Expected JSON.');
        }
        let body = {};
        if (isMutation) {
          let raw='';
          for await (const part of req) { raw+=part; if (raw.length>11_250_000) throw new HttpError(413,'Request too large. Maximum question paper size is 8 MB.'); }
          try { body=raw ? JSON.parse(raw) : {}; } catch { throw new HttpError(400,'Invalid JSON.'); }
        }
        const cookie = String(req.headers.cookie||'').split(';').map(c=>c.trim()).filter(c=>/^a_session_[A-Za-z0-9_]+=/.test(c)).join('; ');
        const output=await api.handle({method:req.method,path:pathname,body,cookie,origin,remoteIP:req.socket.remoteAddress});
        sendJSON(res,output.status,output.body,output.headers);
        return;
      }
      if (!['GET','HEAD'].includes(req.method)) throw new HttpError(405,'Method not allowed.');
      const file = pathname==='/' ? '/index.html' : decodeURIComponent(pathname);
      // Serve only explicitly public assets. Never expose secrets or backend code.
      if (!(/^\/index\.html$/.test(file) || /^\/src\/[a-zA-Z0-9_./-]+\.(?:js|css|svg|png|jpg|webp|woff2)$/.test(file) || /^\/favicon\.ico$/.test(file))) throw new HttpError(404,'Not found.');
      const target=path.resolve(root,'.'+file);
      if(!target.startsWith(root+path.sep)) throw new HttpError(404,'Not found.');
      const info=await stat(target);
      if(!info.isFile()) throw new HttpError(404,'Not found.');
      res.writeHead(200,{ 'Content-Type':(mime[path.extname(target)]||'application/octet-stream')+'; charset=utf-8', 'Cache-Control':secure && file!=='/index.html'?'public, max-age=600':'no-cache' });
      if(req.method==='HEAD') return res.end();
      res.end(await readFile(target));
    } catch(error) {
      const status = Number(error.status)||500;
      if(status>=500) console.error(`[${new Date().toISOString()}] ${req.method} ${pathname}: ${error.message}`);
      if(!res.headersSent) sendJSON(res,status,{error:status>=500 && env.NODE_ENV==='production'?'Server error. Please try again.':error.message});
      else res.end();
    }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||5173);
  if (process.env.NODE_ENV==='production') {
    for (const name of ['APPWRITE_PROJECT_ID','APPWRITE_API_KEY','BATCH_ACCESS_CODE','APP_ORIGIN']) {
      if(!process.env[name]) {console.error(`Missing production environment setting: ${name}`);process.exit(1);}
    }
    if (process.env.BATCH_ACCESS_CODE.length < 12) { console.error('BATCH_ACCESS_CODE must be 12+ characters in production.');process.exit(1); }
  }
  createServer().listen(port,'0.0.0.0',()=>console.log(`Punit Classes API and website on http://localhost:${port}`));
}
