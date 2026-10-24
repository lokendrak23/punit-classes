/** Appwrite TablesDB adapter. All collection access uses the SERVER key.
 *  No collection grants browser read/write; authorization lives in api.mjs.
 */
export class UpstreamError extends Error {
  constructor(message, status = 502) { super(message); this.name = 'UpstreamError'; this.status = status; }
}
export function config(env = process.env) {
  return {
    endpoint: (env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1').replace(/\/$/, ''),
    project: env.APPWRITE_PROJECT_ID || '',
    key: env.APPWRITE_API_KEY || '',
    database: env.APPWRITE_DATABASE_ID || 'punit_classes_prod',
    databaseType: env.APPWRITE_DATABASE_TYPE || 'tablesdb',
  };
}
export function createAppwrite(env = process.env, transport = fetch) {
  const cfg = config(env);
  if (cfg.databaseType !== 'tablesdb') throw new Error('Set APPWRITE_DATABASE_TYPE=tablesdb in .env.');
  const base = 'tablesdb';
  const dbPath = `/${base}/${encodeURIComponent(cfg.database)}`;
  async function request(path, { method = 'GET', body, cookie, admin = false, query } = {}) {
    const url = new URL(cfg.endpoint + path);
    if (query) for (const [key, value] of query) url.searchParams.append(key, value);
    const headers = { 'X-Appwrite-Project': cfg.project, 'Content-Type': 'application/json' };
    if (admin) headers['X-Appwrite-Key'] = cfg.key;
    if (cookie) headers.Cookie = cookie;
    let response;
    try { response = await transport(url.toString(), { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' }); }
    catch { throw new UpstreamError('Unable to connect to Appwrite.', 503); }
    let payload;
    try { payload = await response.json(); } catch { payload = {}; }
    if (!response.ok) {
      const status = response.status;
      throw new UpstreamError(typeof payload.message === 'string' ? payload.message : 'Appwrite request failed', status);
    }
    return { payload, headers: response.headers };
  }
  const route = collection => `${dbPath}/tables/${encodeURIComponent(collection)}/rows`;
  const itemRoute = (collection,id) => `${route(collection)}/${encodeURIComponent(id)}`;
  const jsonFields = { questions:['options'], submissions:['answers'] };
  const encode = (collection,data) => Object.fromEntries(Object.entries(data).map(([k,v]) => [k, (jsonFields[collection]||[]).includes(k) ? JSON.stringify(v) : v]));
  const decode = (collection,doc) => {
    if (!doc) return doc;
    const result = {...doc};
    for (const key of jsonFields[collection]||[]) if (typeof result[key]==='string') {
      try { result[key]=JSON.parse(result[key]); } catch { result[key]=key==='options'?[]:{}; }
    }
    return result;
  };
  return {
    cfg, request, dbPath,
    async me(cookie) { return (await request('/account', { cookie })).payload; },
    async register({ name, email, password }) { return (await request('/account', { method: 'POST', body: { userId: 'unique()', name, email, password } })).payload; },
    async login({ email, password }) { return request('/account/sessions/email', { method: 'POST', body: { email, password } }); },
    async logout(cookie) { return request('/account/sessions/current', { method: 'DELETE', cookie }); },
    async get(collection, id) { return decode(collection,(await request(itemRoute(collection, id), { admin: true })).payload); },
    async find(collection, id) { try { return await this.get(collection, id); } catch (err) { if (err.status === 404) return null; throw err; } },
    async list(collection, max = 800) {
      const result = [];
      for (let offset = 0; offset < max; offset += 100) {
        const queries = [JSON.stringify({ method:'limit', values:[100] }), JSON.stringify({ method:'offset', values:[offset] })];
        const query = queries.map(v => ['queries[]', v]);
        const res = (await request(route(collection), { admin: true, query })).payload.rows || [];
        result.push(...res.map(row=>decode(collection,row)));
        if (res.length < 100) break;
      }
      return result;
    },
    async create(collection, data, id = crypto.randomUUID()) { return (await request(route(collection), { method:'POST', admin:true, body:{ rowId:id, data:encode(collection,data) } })).payload; },
    async update(collection, id, data) { return (await request(itemRoute(collection,id), { method:'PATCH', admin:true, body:{ data:encode(collection,data) } })).payload; },
    async put(collection, id, data) { return (await request(itemRoute(collection,id), { method:'PUT', admin:true, body:{ data:encode(collection,data) } })).payload; },
    async delete(collection, id) { return (await request(itemRoute(collection,id), { method:'DELETE', admin:true })).payload; },
  };
}
