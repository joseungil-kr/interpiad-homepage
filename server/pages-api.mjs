// Production Pages entry: deliberately has no mock-login path or test account support.
export const providers = {
  google: ['https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token', 'https://openidconnect.googleapis.com/v1/userinfo', 'openid'],
  naver: ['https://nid.naver.com/oauth2.0/authorize', 'https://nid.naver.com/oauth2.0/token', 'https://openapi.naver.com/v1/nid/me', ''],
  kakao: ['https://kauth.kakao.com/oauth/authorize', 'https://kauth.kakao.com/oauth/token', 'https://kapi.kakao.com/v2/user/me', '']
};
const kinds = ['manual-invoice', 'manual-invoice-vertical', 'simple-receipt', 'quotation', 'employment-contract'];
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
export const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), n => n.toString(16).padStart(2, '0')).join('');
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const baseHeaders = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'};
const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), {status, headers: {...baseHeaders, 'Content-Type': 'application/json; charset=utf-8', ...extra}});
const redirect = (url, cookies) => new Response(null, {status: 302, headers: {...baseHeaders, Location: url, 'Set-Cookie': cookies}});
const cookie = (name, value, age) => `__Host-mf_${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
function fields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 250) fail(400, 'Invalid fields');
  for (const [key, item] of Object.entries(value)) if (!/^[a-zA-Z0-9-]{1,60}$/.test(key) || typeof item !== 'string' || item.length > 4000) fail(400, 'Invalid field');
  return value;
}
function documentData(value) {
  if (!kinds.includes(value.kind) || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || isNaN(Date.parse(value.date)) ||
    typeof value.customer !== 'string' || value.customer.length > 120 || typeof value.number !== 'string' || value.number.length > 80 ||
    typeof value.snapshot !== 'string' || !value.snapshot || value.snapshot.length > 1200000) fail(400, 'Invalid document');
  return {kind: value.kind, date: value.date, customer: value.customer, number: value.number, fields: fields(value.fields), snapshot: value.snapshot};
}
function customerData(value) {
  if (typeof value.name !== 'string' || !value.name.trim()) fail(400, 'Customer name required');
  return Object.fromEntries(['name', 'address', 'phone', 'registration'].map(key => {
    if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].length > 200)) fail(400, 'Invalid customer');
    return [key, value[key] || ''];
  }));
}
async function body(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'JSON required');
  const reader = request.body?.getReader(); let size = 0, text = ''; const decoder = new TextDecoder();
  if (reader) while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 1500000) { await reader.cancel(); fail(413, 'Too large'); } text += decoder.decode(next.value, {stream: true}); }
  try { const result = JSON.parse(text + decoder.decode() || '{}'); if (!result || typeof result !== 'object' || Array.isArray(result)) fail(400, 'Invalid JSON'); return result; } catch { fail(400, 'Invalid JSON'); }
}
export async function handleRequest(request, env, fetcher = fetch) {
  try {
    const url = new URL(request.url), parts = url.pathname.split('/').filter(Boolean);
    const origin = env.APP_ORIGIN || 'https://interpiad.com';
    const db = env.MY_FORMS_DB;
    const configured = provider => !!(db && env[provider.toUpperCase() + '_CLIENT_ID'] && env[provider.toUpperCase() + '_CLIENT_SECRET']);
    if (url.pathname === '/api/auth-status' && request.method === 'GET') return json({providers: Object.fromEntries(Object.keys(providers).map(p => [p, configured(p)]))});
    if (url.pathname === '/api/test-login') fail(404, 'Not found');
    if (!db) fail(503, '개인 저장 서비스 연결을 준비하고 있습니다. 작성·인쇄는 계속 이용할 수 있습니다.');
    if (new URL(origin).protocol !== 'https:') fail(503, 'HTTPS origin required');
    // Preview domains must not receive production cookies or write production data.
    if (url.origin !== origin) fail(403, '개인 저장은 interpiad.com에서 이용해 주세요.');
    const stmt = (sql, ...values) => db.prepare(sql).bind(...values);
    const first = (sql, ...values) => stmt(sql, ...values).first();
    const run = (sql, ...values) => stmt(sql, ...values).run();
    const rows = async (sql, ...values) => (await stmt(sql, ...values).all()).results;
    const cookies = Object.fromEntries((request.headers.get('cookie') || '').split(';').filter(x => x.includes('=')).map(x => x.trim().split('=')));
    const now = Date.now();
    async function limit(key, max) {
      const bucket = await hash(key + ':' + Math.floor(now / 60000));
      const result = await first('INSERT INTO request_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count', bucket, now + 120000);
      if (result.count > max) fail(429, '요청이 많습니다. 잠시 후 다시 시도해 주세요.');
    }
    if (parts[0] === 'auth' && providers[parts[1]] && request.method === 'GET') {
      const provider = parts[1];
      if (!configured(provider)) return redirect('/tools/my-forms/?login=unavailable', cookie('oauth', '', 0));
      await limit('login:' + (request.headers.get('CF-Connecting-IP') || 'unknown'), 30);
      const cfg = providers[provider], prefix = provider.toUpperCase(), callback = origin + '/auth/' + provider + '/callback';
      if (parts.length === 2) {
        const state = token(), browser = token();
        await db.batch([stmt('DELETE FROM oauth WHERE expires<?', now), stmt('DELETE FROM request_limits WHERE expires<?', now), stmt('INSERT INTO oauth VALUES(?,?,?,?)', await hash(state), provider, await hash(browser), now + 600000)]);
        const target = new URL(cfg[0]); target.search = new URLSearchParams({client_id: env[prefix + '_CLIENT_ID'], redirect_uri: callback, response_type: 'code', state, ...(cfg[3] ? {scope: cfg[3]} : {})});
        return redirect(target.href, cookie('oauth', browser, 600));
      }
      if (parts.length !== 3 || parts[2] !== 'callback') fail(404, 'Not found');
      const state = url.searchParams.get('state') || '';
      // Atomic consumption prevents two concurrent callbacks using the same state.
      const pending = await first('DELETE FROM oauth WHERE id=? AND provider=? AND browser=? AND expires>? RETURNING id', await hash(state), provider, await hash(cookies['__Host-mf_oauth'] || ''), now);
      if (!pending) fail(403, 'Invalid OAuth state');
      if (url.searchParams.has('error') || !url.searchParams.get('code')) return redirect('/tools/my-forms/?login=cancelled', cookie('oauth', '', 0));
      const response = await fetcher(cfg[1], {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({grant_type: 'authorization_code', client_id: env[prefix + '_CLIENT_ID'], client_secret: env[prefix + '_CLIENT_SECRET'], redirect_uri: callback, code: url.searchParams.get('code'), state}), signal: AbortSignal.timeout(10000)});
      const result = await response.json(); if (!response.ok || typeof result.access_token !== 'string') fail(502, 'Login failed');
      const profileResponse = await fetcher(cfg[2], {headers: {Authorization: 'Bearer ' + result.access_token}, signal: AbortSignal.timeout(10000)});
      const profile = await profileResponse.json(); if (!profileResponse.ok) fail(502, 'Identity lookup failed');
      const subject = provider === 'google' ? profile.sub : provider === 'naver' ? (profile.resultcode === '00' ? profile.response?.id : null) : profile.id;
      if (!subject || !['string', 'number'].includes(typeof subject) || String(subject).length > 200) fail(502, 'Invalid identity');
      await run('INSERT INTO accounts VALUES(?,?,?) ON CONFLICT(provider,subject) DO NOTHING', token(), provider, String(subject));
      const owner = (await first('SELECT id FROM accounts WHERE provider=? AND subject=?', provider, String(subject))).id;
      const session = token();
      await db.batch([stmt('DELETE FROM sessions WHERE expires<? OR id=?', now, await hash(cookies['__Host-mf_session'] || '')), stmt('INSERT INTO sessions VALUES(?,?,?,?)', await hash(session), owner, token(), now + 86400000)]);
      return redirect('/tools/my-forms/', cookie('session', session, 86400));
    }
    if (parts[0] !== 'api') fail(404, 'Not found');
    const session = await first('SELECT * FROM sessions WHERE id=? AND expires>?', await hash(cookies['__Host-mf_session'] || ''), now);
    if (!session) fail(401, 'Login required');
    if (request.method !== 'GET') {
      if (request.headers.get('origin') !== origin || request.headers.get('x-csrf-token') !== session.csrf) fail(403, 'Invalid CSRF token');
      await limit('write:' + session.owner, 60);
    }
    if (url.pathname === '/api/session' && request.method === 'GET') return json({csrf: session.csrf});
    if (url.pathname === '/api/logout' && request.method === 'POST') { await run('DELETE FROM sessions WHERE id=?', session.id); return json({}, 200, {'Set-Cookie': cookie('session', '', 0)}); }
    const resource = parts[1], id = parts[2];
    if (!['documents', 'customers'].includes(resource)) fail(404, 'Not found');
    const row = id ? await first(`SELECT * FROM ${resource} WHERE id=? AND owner=?`, id, session.owner) : null;
    if (id && !row) fail(404, 'Not found');
    const read = async (r, detail = false) => {
      if (resource === 'customers') return {id: r.id, deleted: !!r.deleted, version: r.version, ...JSON.parse(r.data)};
      const versions = await rows(`SELECT version,${detail ? 'data' : "json_remove(data,'$.snapshot','$.fields') AS data"},created FROM revisions WHERE document=? ORDER BY version DESC`, r.id);
      return {id: r.id, kind: r.kind, deleted: !!r.deleted, versions: versions.map(v => {const data = JSON.parse(v.data); if (!detail) {delete data.snapshot; delete data.fields;} return {...data, version: v.version, created: v.created};})};
    };
    if (request.method === 'GET') {
      if (id && parts[3] === 'snapshot' && resource === 'documents') {
        const revision = await first('SELECT data FROM revisions WHERE document=? AND version=?', id, Number(url.searchParams.get('version')));
        if (!revision) fail(404, 'Not found');
        return new Response(JSON.parse(revision.data).snapshot, {headers: {...baseHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "sandbox allow-same-origin allow-modals; default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"}});
      }
      if (id) return json(await read(row, true));
      let result = await Promise.all((await rows(`SELECT * FROM ${resource} WHERE owner=? AND deleted=?`, session.owner, url.searchParams.get('trash') === '1' ? 1 : 0)).map(r => read(r)));
      for (const key of ['kind', 'customer', 'date', 'number', 'name']) if (url.searchParams.get(key)) {
        const query = url.searchParams.get(key).toLocaleLowerCase();
        result = result.filter(r => {const value = String((r.versions?.[0] || r)[key] || '').toLocaleLowerCase(); return ['kind', 'date'].includes(key) ? value === query : value.includes(query);});
      }
      return json(result);
    }
    if (request.method === 'DELETE' && id) { await run(`UPDATE ${resource} SET deleted=1 WHERE id=? AND owner=?`, id, session.owner); return json({}); }
    if (request.method === 'POST' && id && parts[3] === 'restore') { await run(`UPDATE ${resource} SET deleted=0 WHERE id=? AND owner=?`, id, session.owner); return json({}); }
    if (!((request.method === 'POST' && !id) || (request.method === 'PUT' && id && !row.deleted))) fail(405, 'Method not allowed');
    const data = await body(request), clean = resource === 'customers' ? customerData(data) : documentData(data), newId = id || token();
    if (resource === 'customers') {
      if (id) {
        const result = await run('UPDATE customers SET data=?,version=version+1 WHERE id=? AND owner=? AND version=? AND deleted=0', JSON.stringify(clean), id, session.owner, data.version ?? -1);
        if (!result.meta.changes) fail(409, 'Customer changed; reload before editing');
      } else await run('INSERT INTO customers(id,owner,data) VALUES(?,?,?)', newId, session.owner, JSON.stringify(clean));
    } else if (id) {
      if (clean.kind !== row.kind || !Number.isInteger(data.version)) fail(409, 'Document changed; reload before editing');
      const result = await run('INSERT INTO revisions(document,version,data,created) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM documents WHERE id=? AND owner=? AND deleted=0) AND (SELECT MAX(version) FROM revisions WHERE document=?)=?', id, data.version + 1, JSON.stringify(clean), new Date().toISOString(), id, session.owner, id, data.version);
      if (!result.meta.changes) fail(409, 'Document changed; reload before editing');
    } else await db.batch([stmt('INSERT INTO documents(id,owner,kind) VALUES(?,?,?)', newId, session.owner, clean.kind), stmt('INSERT INTO revisions VALUES(?,?,?,?)', newId, 1, JSON.stringify(clean), new Date().toISOString())]);
    return json({id: newId}, id ? 200 : 201);
  } catch (error) { return json({error: error.status ? error.message : 'Request failed'}, error.status || 500); }
}
