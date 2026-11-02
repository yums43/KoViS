// Run the actual API handler against SQLite. Only the platform identity is mocked.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const temp=mkdtempSync(join(tmpdir(),'kovis-test-')),dbPath=join(temp,'visits.sqlite');
let sql,assertions=0;const NativeDate=Date;let clock=Date.parse('2026-11-02T02:00:00Z');
globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
function open(){sql=new DatabaseSync(dbPath);sql.exec('PRAGMA foreign_keys=ON');}open();
for(const file of readdirSync('drizzle').filter(s=>s.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
class Statement{constructor(query){this.query=query;this.values=[];}bind(...values){this.values=values;return this;}async first(){return sql.prepare(this.query).get(...this.values)||null;}async all(){return {results:sql.prepare(this.query).all(...this.values)};}async run(){const r=sql.prepare(this.query).run(...this.values);return {meta:{changes:Number(r.changes)}};}}
let queue=Promise.resolve();
globalThis.__testDB={prepare:q=>new Statement(q),batch:statements=>{const result=queue.then(async()=>{sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}});queue=result.catch(()=>{});return result;}};
const transpile=(source,out)=>writeFileSync(join(temp,out),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
for(const file of ['policy','demo'])transpile(readFileSync('lib/'+file+'.ts','utf8'),file+'.mjs');
let source=readFileSync('app/api/kovis/route.ts','utf8').replace("import {env} from 'cloudflare:workers';","const env={DB:globalThis.__testDB};").replace("import {getChatGPTUser} from '../../chatgpt-auth';","const getChatGPTUser=async()=>globalThis.__testIdentity;").replace("'../../../lib/policy'","'./policy.mjs'").replace("'../../../lib/demo'","'./demo.mjs'");
transpile(source,'route.mjs');transpile(readFileSync('lib/reports.ts','utf8').replace("'./policy'","'./policy.mjs'"),'reports.mjs');const {filterVisits,reportCSV}=await import(join(temp,'reports.mjs'));const {POST,GET}=await import(join(temp,'route.mjs'));const {metrics}=await import(join(temp,'policy.mjs'));
const equal=(a,b,msg)=>{assert.equal(a,b,msg);assertions++;};const ok=(v,msg)=>{assert.ok(v,msg);assertions++;};
const identity=name=>globalThis.__testIdentity=name?{userId:name,email:name+'@example.com',displayName:name}:null;
async function post(action,body={},expected=200){const r=await POST(new Request('https://kovis.test/api/kovis',{method:'POST',headers:{origin:'https://kovis.test','content-type':'application/json'},body:JSON.stringify({action,...body})}));const data=await r.json();equal(r.status,expected,action+': '+JSON.stringify(data));return data;}
async function get(dataset='live'){const r=await GET(new Request('https://kovis.test/api/kovis?dataset='+dataset));return {status:r.status,...await r.json()};}
const visit=id=>sql.prepare('SELECT * FROM visits WHERE id=?').get(id);
try{
 identity(null);await post('bootstrap',{},401);equal((await get()).readonly,true);
 identity('owner');await post('bootstrap');await post('bootstrap',{},409);
 await post('department',{value:{name:'Pentadbiran',location:'Blok A'}});const department=sql.prepare('SELECT * FROM departments').get();
 await post('host',{value:{name:'Pegawai Contoh',department_id:department.id}});const host=sql.prepare('SELECT * FROM hosts').get();
 await post('staff',{value:{name:'Pengawal Ujian',email:'guard@example.com',role:'admin'}});equal(sql.prepare("SELECT role FROM users WHERE email='guard@example.com'").get().role,'guard','Admin cannot create an admin by submitted role');
 identity('visitor');await post('register',{name:'Pelawat Ujian',phone:'0123456789',organisation:'',consent:true,role:'admin'});equal(sql.prepare("SELECT role FROM users WHERE email='visitor@example.com'").get().role,'visitor','Public registration fixes visitor role');
 equal((await get()).dataset,'live','Registered visitor gets live data');equal((await get('demo')).status,403);
 await post('staff',{value:{name:'Escalation',email:'visitor@example.com',role:'admin'}},403);
 const form={purpose:'Urusan dokumen kolej',department_id:department.id,host_id:host.id,visit_date:'2026-11-02',arrival:'09:30',transport:'walk',companions:2};
 await post('visit',{value:{...form,transport:'car'}},400);
 const first=await post('visit',{value:form});const id=first.id;ok(first.reference.startsWith('KV-261102-'));
 await post('visit',{value:form},409);await post('checkin',{id},409);await post('checkout',{id},409);
 identity('guard');let view=await get();equal(view.user.role,'guard');equal(view.data.visits.length,1);
 await post('policy',{value:{}},403);await post('staff',{value:{name:'Upgrade',email:'guard@example.com',role:'admin'}},403);
 await post('reject',{id,reason:''},400);await post('approve',{id});await post('reject',{id,reason:'Sudah diproses'},409);
 identity('stranger');await post('register',{name:'Pelawat Lain',phone:'0198765432',organisation:'',consent:true});equal((await get()).data.visits.length,0);equal((await get()).data.history.length,0);await post('checkin',{id},403);
 identity('visitor');await post('checkout',{id},409);await post('checkin',{id});equal(visit(id).status,'inside');await post('checkin',{id},409);
 identity('guard');await post('checkout',{id,reason:''},400);await post('checkout',{id,reason:'Telefon pelawat kehabisan bateri'});equal(visit(id).status,'completed');ok(visit(id).checkout_at,'Server records checkout');
 equal(sql.prepare('SELECT count(*) AS n FROM visit_status_history WHERE visit_id=?').get(id).n,4,'Every successful state change retained');
 ok(sql.prepare("SELECT details FROM audit_logs WHERE action='Rekod bantuan pengawal'").get().details.includes('Telefon pelawat'),'Assistance reason retained');
 identity('visitor');await post('checkout',{id},409);
 const second=await post('visit',{value:form});identity('guard');await post('reject',{id:second.id,reason:'Pegawai tiada di kampus'});identity('visitor');await post('checkin',{id:second.id},409);
 const third=await post('visit',{value:form});await post('cancel',{id:third.id});equal(visit(third.id).status,'cancelled');
 await post('visit',{value:form},429);clock+=60000;const fourth=await post('visit',{value:form});identity('guard');await post('approve',{id:fourth.id});clock+=3*3600000;identity('visitor');await post('checkin',{id:fourth.id},409);equal(visit(fourth.id).status,'expired');
 const fifth=await post('visit',{value:{...form,arrival:'13:00'}});identity('guard');await post('approve',{id:fifth.id});identity('visitor');
 const concurrent=await Promise.all([post('checkin',{id:fifth.id},200),POST(new Request('https://kovis.test/api/kovis',{method:'POST',headers:{origin:'https://kovis.test'},body:JSON.stringify({action:'checkin',id:fifth.id})}))]);equal(concurrent[1].status,409,'Concurrent duplicate checkin rejected');
 clock+=6*3600000;await get();equal(visit(fifth.id).status,'inside','Overdue visit remains inside without invented checkout');
 identity('owner');view=await get();const onlyCompleted=filterVisits(view.data.visits,{filters:{status:'completed',from:'2026-11-02',to:'2026-11-02'}});equal(onlyCompleted.length,1,'Date/status report filters match DB');const csv=reportCSV(onlyCompleted);equal(csv.split('\r\n').length,2,'CSV contains exactly filtered records');ok(csv.includes(first.reference)&&!csv.includes(second.reference),'Export obeys filters');ok(csv.includes('Pengawal Ujian'),'Export includes approving guard');ok(reportCSV([{...onlyCompleted[0],name:' =SUM(1)'}]).includes("' =SUM(1)"),'CSV formula neutralized');const stats=metrics(view.data.visits);equal(stats.inside,1);equal(stats.people,3);equal(stats.completed,1);equal(stats.rejected,1);
 await post('seed');const demo=await get('demo');equal(demo.data.visits.length,12);equal((await get()).data.visits.length,5,'Demo separate from live');
 sql.close();open();equal(sql.prepare('SELECT count(*) AS n FROM visits WHERE dataset=\'live\'').get().n,5,'Records survive DB restart');
 const guard=sql.prepare("SELECT * FROM users WHERE email='guard@example.com'").get();await post('staff',{value:{...guard,active:0}});identity('guard');equal((await get()).status,403);
 const csrf=await POST(new Request('https://kovis.test/api/kovis',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}));equal(csrf.status,403,'Cross-site write blocked');
 identity('owner');
 for(const body of [null,[],"invalid",42,{}, {action:'policy',value:null},{action:'staff',value:[]},{action:'visit',value:'bad'}]){
  const response=await POST(new Request('https://kovis.test/api/kovis',{method:'POST',headers:{origin:'https://kovis.test'},body:JSON.stringify(body)}));
  equal(response.status,400,'Malformed request is a client error');
 }
 const malformed=await POST(new Request('https://kovis.test/api/kovis',{method:'POST',headers:{origin:'https://kovis.test'},body:'{'}));equal(malformed.status,400,'Invalid JSON rejected');
 identity('visitor');clock+=60000;
 const collision=await Promise.all([1,2].map(()=>POST(new Request('https://kovis.test/api/kovis',{method:'POST',headers:{origin:'https://kovis.test'},body:JSON.stringify({action:'visit',value:{...form,visit_date:'2026-11-03'}})}))));
 equal(collision.map(r=>r.status).sort().join(','),'200,409','Concurrent active requests create exactly one visit');
 identity('owner');const future=sql.prepare("SELECT * FROM visits WHERE visit_date='2026-11-03'").get();await post('approve',{id:future.id});
 identity('visitor');await post('checkin',{id:future.id},409);equal(visit(future.id).checkin_at,null,'Future visit cannot check in early');
 let healthSource=readFileSync('app/api/health/route.ts','utf8').replace("import {env} from 'cloudflare:workers';","const env={DB:globalThis.__testDB};");transpile(healthSource,'health.mjs');const health=await import(join(temp,'health.mjs'));
 const healthy=await health.GET();equal(healthy.status,200);equal((await healthy.json()).version,'0.2.0');
 const savedPrepare=globalThis.__testDB.prepare;globalThis.__testDB.prepare=()=>{throw Error('offline');};equal((await health.GET()).status,503,'Health fails when database unavailable');globalThis.__testDB.prepare=savedPrepare;
 console.log(`PASS: ${assertions} assertions — actual API route, SQLite migrations, identity mocked.`);
}finally{sql.close();globalThis.Date=NativeDate;rmSync(temp,{recursive:true,force:true});}
