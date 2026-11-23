import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {handleRequest, hash} from '../server/pages-api.mjs';
const origin='https://interpiad.com';
let checks=0; const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
test('Pages/D1 production API: ownership, immutable revisions, concurrency, OAuth, CSRF and disabled test auth',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-11-23',d1Databases:['MY_FORMS_DB']}));
 try {
 const db=await mf.getD1Database('MY_FORMS_DB');await db.exec(await readFile('migrations/0001_my_forms.sql','utf8'));
 const env={MY_FORMS_DB:db,APP_ORIGIN:origin};
 for(const p of ['GOOGLE','NAVER','KAKAO']){env[p+'_CLIENT_ID']='test-id';env[p+'_CLIENT_SECRET']='test-secret';}
 async function request(path,{method='GET',data,user,csrf=true,from=origin,cookie,urlOrigin=origin,fetcher}={}){
  const headers={'Content-Type':'application/json',Origin:from,'CF-Connecting-IP':'192.0.2.1'};
  if(user){headers.Cookie='__Host-mf_session='+user; if(csrf)headers['X-CSRF-Token']='csrf-'+user;}
  if(cookie)headers.Cookie=cookie;
  return handleRequest(new Request(urlOrigin+path,{method,headers,...(data?{body:JSON.stringify(data)}:{})}),env,fetcher);
 }
 for(const user of ['alpha','beta']){await db.prepare('INSERT INTO accounts VALUES(?,?,?)').bind(user,'fixture',user).run();await db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').bind(await hash(user),user,'csrf-'+user,Date.now()+600000).run();}
 eq((await request('/api/test-login',{method:'POST',data:{account:'alpha'}})).status,404);
 eq((await request('/api/session',{user:'alpha',urlOrigin:'https://preview.pages.dev'})).status,403);
 for(const resource of ['customers','documents']){
  eq((await request('/api/'+resource)).status,401);
  const data=resource==='customers'?{name:'SYNTHETIC Customer',address:'Test address'}:{kind:'quotation',date:'2026-11-23',number:'TEST-001',customer:'SYNTHETIC Customer',fields:{buyer:'SYNTHETIC Customer'},snapshot:'<!doctype html><p>Original</p>'};
  eq((await request('/api/'+resource,{method:'POST',data,user:'alpha',csrf:false})).status,403);
  eq((await request('/api/'+resource,{method:'POST',data,user:'alpha',from:'https://evil.test'})).status,403);
  const created=await request('/api/'+resource,{method:'POST',data,user:'alpha'});eq(created.status,201);const {id}=await created.json();const path='/api/'+resource+'/'+id;
  eq(await (await request('/api/'+resource,{user:'beta'})).json(),[]);
  for(const [method,suffix] of [['GET',''],['PUT',''],['DELETE',''],['POST','/restore'],['GET','/snapshot?version=1']])eq((await request(path+suffix,{method,user:'beta',...(['PUT','POST'].includes(method)?{data}:{})})).status,404);
  const revised={...data,version:1,...(resource==='customers'?{name:'SYNTHETIC Edited'}:{fields:{buyer:'Edited'}})};
  const results=await Promise.all([request(path,{method:'PUT',data:revised,user:'alpha'}),request(path,{method:'PUT',data:revised,user:'alpha'})]);eq(results.map(r=>r.status).sort(),[200,409]);
  const current=await (await request(path,{user:'alpha'})).json();
  if(resource==='documents'){
   eq(current.versions.length,2);eq(current.versions[1].fields.buyer,'SYNTHETIC Customer');
   const snapshot=await request(path+'/snapshot?version=1',{user:'alpha'});eq(await snapshot.text(),data.snapshot);eq(snapshot.headers.get('content-security-policy').includes("default-src 'none'"),true);
   for(const [key,value] of Object.entries({kind:data.kind,date:data.date,number:data.number,customer:data.customer}))eq((await (await request('/api/documents?'+new URLSearchParams({[key]:value}),{user:'alpha'})).json()).length,1);
   eq((await (await request('/api/documents',{user:'alpha'})).json())[0].versions[0].snapshot,undefined);
  }
  eq((await request(path,{method:'DELETE',user:'alpha'})).status,200);eq((await (await request('/api/'+resource,{user:'alpha'})).json()).length,0);
  eq((await (await request('/api/'+resource+'?trash=1',{user:'alpha'})).json()).length,1);
  eq((await request(path+'/restore',{method:'POST',user:'alpha'})).status,200);eq((await (await request('/api/'+resource,{user:'alpha'})).json()).length,1);
 }
 for(const provider of ['google','naver','kakao']){
  const start=await request('/auth/'+provider);eq(start.status,302);const target=new URL(start.headers.get('location'));const state=target.searchParams.get('state');const cookie=start.headers.get('set-cookie').split(';')[0];let calls=0;
  const fetcher=async(url,options)=>{calls++;if(calls===1){eq(String(options.body).includes('client_secret=test-secret'),true);return Response.json({access_token:'fixture-token'});}return Response.json(provider==='google'?{sub:'123',email:'same@example.test'}:provider==='naver'?{resultcode:'00',response:{id:'123',email:'same@example.test'}}:{id:123});};
  eq((await request('/auth/'+provider+'/callback?state='+state+'&code=fixture',{fetcher})).status,403);
  const finish=await request('/auth/'+provider+'/callback?state='+state+'&code=fixture',{cookie,fetcher});eq(finish.status,302);eq(finish.headers.get('set-cookie').includes('Secure'),true);
  eq((await request('/auth/'+provider+'/callback?state='+state+'&code=fixture',{cookie,fetcher})).status,403);eq(calls,2);
 }
 eq((await db.prepare("SELECT count(*) AS n FROM accounts WHERE subject='123'").first()).n,3);
 const start=await request('/auth/google');const state=new URL(start.headers.get('location')).searchParams.get('state');const cookie=start.headers.get('set-cookie').split(';')[0];await db.prepare('UPDATE oauth SET expires=0').run();eq((await request('/auth/google/callback?state='+state+'&code=x',{cookie})).status,403);
 await db.prepare("UPDATE sessions SET expires=0 WHERE owner='alpha'").run();eq((await request('/api/session',{user:'alpha'})).status,401);
 delete env.GOOGLE_CLIENT_SECRET;eq((await (await request('/api/auth-status')).json()).providers.google,false);
 eq((await request('/auth/google')).headers.get('location'),'/tools/my-forms/?login=unavailable');
 eq((await handleRequest(new Request(origin+'/api/documents'),{})).status,503);
 console.log(JSON.stringify({pagesD1Checks:checks}));
 } finally {await mf.dispose();}
});
