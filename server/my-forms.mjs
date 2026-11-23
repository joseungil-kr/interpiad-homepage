import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const providers={
 google:['https://accounts.google.com/o/oauth2/v2/auth','https://oauth2.googleapis.com/token','https://openidconnect.googleapis.com/v1/userinfo','openid'],
 naver:['https://nid.naver.com/oauth2.0/authorize','https://nid.naver.com/oauth2.0/token','https://openapi.naver.com/v1/nid/me',''],
 kakao:['https://kauth.kakao.com/oauth/authorize','https://kauth.kakao.com/oauth/token','https://kapi.kakao.com/v2/user/me','']
};
export const kinds=['manual-invoice','manual-invoice-vertical','simple-receipt','quotation','employment-contract'];
const token=()=>randomBytes(32).toString('base64url'), hash=x=>createHash('sha256').update(x).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createApp({database='my-forms.sqlite',origin='http://127.0.0.1:8765',mode='production',mock=false,publicDir='public',env=process.env,fetcher=fetch}={}){
 const base=new URL(origin);if(mock&&(mode!=='test'||!['127.0.0.1','localhost'].includes(base.hostname)))throw Error('Mock authentication is restricted to loopback test mode');
 if(mode==='production'&&base.protocol!=='https:')throw Error('Production requires HTTPS');
 const db=new DatabaseSync(database);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,provider TEXT NOT NULL,subject TEXT NOT NULL,UNIQUE(provider,subject));
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,owner TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS oauth(id TEXT PRIMARY KEY,provider TEXT,browser TEXT,expires INTEGER);
 CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY,owner TEXT NOT NULL,data TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,owner TEXT NOT NULL,kind TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS revisions(document TEXT NOT NULL,version INTEGER NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(document,version),FOREIGN KEY(document) REFERENCES documents(id));`);
 const cookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${base.protocol==='https:'?'; Secure':''}`;
 const account=(provider,subject)=>{if(!subject||!['string','number'].includes(typeof subject)||String(subject).length>200)fail(502,'Invalid provider identity');let row=db.prepare('SELECT id FROM accounts WHERE provider=? AND subject=?').get(provider,String(subject));if(!row){row={id:token()};db.prepare('INSERT INTO accounts VALUES(?,?,?)').run(row.id,provider,String(subject));}return row.id;};
 const login=(res,owner)=>{const id=token(),csrf=token();db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(id),owner,csrf,Date.now()+86400000);res.setHeader('Set-Cookie',cookie('mf_session',id,86400));return {csrf};};
 const parseCookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(x=>x.includes('=')).map(x=>x.trim().split('=')));
 const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1500000)fail(413,'Too large');}try{return JSON.parse(raw||'{}');}catch{fail(400,'Invalid JSON');}};
 const fields=x=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length>250)fail(400,'Invalid fields');for(const [k,v] of Object.entries(x)){if(!/^[a-zA-Z0-9-]{1,60}$/.test(k)||typeof v!=='string'||v.length>4000)fail(400,'Invalid field');}return x;};
 const documentData=x=>{if(!kinds.includes(x.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||isNaN(Date.parse(x.date))||typeof x.customer!=='string'||x.customer.length>120||typeof x.number!=='string'||x.number.length>80||typeof x.snapshot!=='string'||!x.snapshot||x.snapshot.length>1200000)fail(400,'Invalid document metadata');return {kind:x.kind,date:x.date,customer:x.customer,number:x.number,fields:fields(x.fields),snapshot:typeof x.snapshot==='string'&&x.snapshot.length<=1200000?x.snapshot:''};};
 const customerData=x=>{const allowed=['name','address','phone','registration'];if(!x||typeof x.name!=='string'||!x.name.trim())fail(400,'Customer name required');const out={};for(const k of allowed){if(x[k]!==undefined&&(typeof x[k]!=='string'||x[k].length>200))fail(400,'Invalid customer');out[k]=x[k]||'';}return out;};
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
 const handler=async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 try{
 const url=new URL(req.url,origin),parts=url.pathname.split('/').filter(Boolean),cookies=parseCookies(req);
 db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('DELETE FROM oauth WHERE expires<?').run(Date.now());
 if(url.pathname==='/api/test-login'&&mock&&req.method==='POST'){
 if(req.headers.origin!==origin)fail(403,'Origin required');const data=await body(req);if(!['alpha','beta'].includes(data.account))fail(400,'Unknown test account');return json(res,200,login(res,account('test',data.account)));}
 if(parts[0]==='auth'&&providers[parts[1]]&&req.method==='GET'){
 const provider=parts[1],cfg=providers[provider],prefix=provider.toUpperCase(),id=env[prefix+'_CLIENT_ID'],secret=env[prefix+'_CLIENT_SECRET'],redirect=origin+'/auth/'+provider+'/callback';
 if(!id||!secret)fail(503,'Login provider is not configured');
 if(parts.length===2){const state=token(),browser=token();db.prepare('INSERT INTO oauth VALUES(?,?,?,?)').run(hash(state),provider,hash(browser),Date.now()+600000);res.setHeader('Set-Cookie',cookie('mf_oauth',browser,600));const dest=new URL(cfg[0]);dest.search=new URLSearchParams({client_id:id,redirect_uri:redirect,response_type:'code',state,...(cfg[3]?{scope:cfg[3]}:{})});res.writeHead(302,{Location:dest.href});return res.end();}
 if(parts[2]==='callback'){
 const state=url.searchParams.get('state')||'',pending=db.prepare('SELECT * FROM oauth WHERE id=?').get(hash(state));
 if(!pending||pending.provider!==provider||pending.browser!==hash(cookies.mf_oauth||''))fail(403,'Invalid OAuth state');db.prepare('DELETE FROM oauth WHERE id=?').run(hash(state));
 if(url.searchParams.has('error')||!url.searchParams.get('code'))fail(400,'Login was cancelled');
 const response=await fetcher(cfg[1],{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:id,client_secret:secret,redirect_uri:redirect,code:url.searchParams.get('code'),state}),signal:AbortSignal.timeout(10000)});const result=await response.json();if(!response.ok||typeof result.access_token!=='string')fail(502,'Token exchange failed');
 const profileResponse=await fetcher(cfg[2],{headers:{Authorization:'Bearer '+result.access_token},signal:AbortSignal.timeout(10000)});const profile=await profileResponse.json();if(!profileResponse.ok)fail(502,'Identity lookup failed');const subject=provider==='google'?profile.sub:provider==='naver'?(profile.resultcode==='00'?profile.response?.id:null):profile.id;
 login(res,account(provider,subject));res.writeHead(302,{Location:'/tools/my-forms/'});return res.end();}
 fail(404,'Not found');}
 if(parts[0]==='api'){
 const session=db.prepare('SELECT * FROM sessions WHERE id=?').get(hash(cookies.mf_session||''));if(!session)fail(401,'Login required');
 if(!['GET','HEAD'].includes(req.method)&&(req.headers.origin!==origin||req.headers['x-csrf-token']!==session.csrf))fail(403,'Invalid CSRF token');
 if(url.pathname==='/api/session'&&req.method==='GET')return json(res,200,{csrf:session.csrf});
 if(url.pathname==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE id=?').run(session.id);res.setHeader('Set-Cookie',cookie('mf_session','',0));return json(res,200,{});}
 const resource=parts[1],id=parts[2];if(!['customers','documents'].includes(resource))fail(404,'Not found');
 const row=id?db.prepare(`SELECT * FROM ${resource} WHERE id=? AND owner=?`).get(id,session.owner):null;if(id&&!row)fail(404,'Not found');
 const read=r=>resource==='customers'?{id:r.id,deleted:!!r.deleted,version:r.version,...JSON.parse(r.data)}:{id:r.id,deleted:!!r.deleted,kind:r.kind,versions:db.prepare('SELECT version,data,created FROM revisions WHERE document=? ORDER BY version DESC').all(r.id).map(v=>({...JSON.parse(v.data),version:v.version,created:v.created}))};
 if(req.method==='GET'){
 if(id&&resource==='documents'&&parts[3]==='snapshot'){
 const revision=db.prepare('SELECT data FROM revisions WHERE document=? AND version=?').get(id,Number(url.searchParams.get('version')));if(!revision)fail(404,'Not found');
 res.setHeader('Content-Security-Policy',"sandbox allow-same-origin allow-modals; default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'");res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(JSON.parse(revision.data).snapshot);
 }
 if(id)return json(res,200,read(row));let rows=db.prepare(`SELECT * FROM ${resource} WHERE owner=? AND deleted=?`).all(session.owner,url.searchParams.get('trash')==='1'?1:0).map(read);
 for(const key of ['kind','customer','date','number','name'])if(url.searchParams.get(key)){const q=url.searchParams.get(key).toLocaleLowerCase();rows=rows.filter(r=>{const value=String((r.versions?.[0]||r)[key]||'').toLocaleLowerCase();return ['kind','date'].includes(key)?value===q:value.includes(q);});}return json(res,200,rows);}
 if(req.method==='DELETE'&&id){db.prepare(`UPDATE ${resource} SET deleted=1 WHERE id=? AND owner=?`).run(id,session.owner);return json(res,200,{});}
 if(req.method==='POST'&&id&&parts[3]==='restore'){db.prepare(`UPDATE ${resource} SET deleted=0 WHERE id=? AND owner=?`).run(id,session.owner);return json(res,200,{});}
 if(!((req.method==='POST'&&!id)||(req.method==='PUT'&&id&&!row.deleted)))fail(405,'Method not allowed');
 const data=await body(req),clean=resource==='customers'?customerData(data):documentData(data),newId=id||token();
 db.exec('BEGIN IMMEDIATE');try{
 if(resource==='customers'){
 if(id){const result=db.prepare('UPDATE customers SET data=?,version=version+1 WHERE id=? AND owner=? AND version=?').run(JSON.stringify(clean),id,session.owner,data.version);if(!result.changes)fail(409,'Customer changed; reload before editing');}
 else db.prepare('INSERT INTO customers(id,owner,data) VALUES(?,?,?)').run(newId,session.owner,JSON.stringify(clean));
 }else{
 if(!id)db.prepare('INSERT INTO documents(id,owner,kind) VALUES(?,?,?)').run(newId,session.owner,clean.kind);
 const version=db.prepare('SELECT COALESCE(MAX(version),0) AS n FROM revisions WHERE document=?').get(newId).n;
 if(id&&(data.version!==version||clean.kind!==row.kind))fail(409,'Document changed; reload before editing');
 db.prepare('INSERT INTO revisions VALUES(?,?,?,?)').run(newId,version+1,JSON.stringify(clean),new Date().toISOString());}
 db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
 return json(res,id?200:201,{id:newId});}
 if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed');
 const root=path.resolve(publicDir),requested=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+requested+(requested.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep))fail(404,'Not found');
 const bytes=await readFile(file).catch(()=>fail(404,'Not found'));const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.xml':'application/xml'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(bytes);
 }catch(error){json(res,error.status||500,{error:error.status?error.message:'Request failed'});}};
 return {handler,db,close:()=>db.close()};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=createApp({database:process.env.MY_FORMS_DB||'my-forms.sqlite',origin:process.env.APP_ORIGIN||'http://127.0.0.1:8765',mode:process.env.NODE_ENV||'production',mock:process.env.MY_FORMS_TEST_AUTH==='1',publicDir:process.env.PUBLIC_DIR||'public'});
 http.createServer(app.handler).listen(Number(process.env.PORT||8765),'127.0.0.1',()=>console.log('My forms server listening on loopback'));
}
