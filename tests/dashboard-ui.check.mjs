// Synthetic data only. No account or network access.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {Window}=await import(process.env.HAPPY_DOM_ENTRY||'happy-dom');
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const w=new Window({url:'https://example.test/admin.html',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
w.document.write(read('admin.html').replace(/<script\b[\s\S]*?<\/script>/g,''));
let fail=false,resolvePending;
const students=Array.from({length:6},(_,i)=>({id:'s'+i,full_name:i===0?'<img src=x>':'Aluno '+i,role:'student'}));
w.LG_AUTH={createClient:()=>({from(table){const query={select(){return query},eq(){return query},order(){return query},then(resolve){if(resolvePending){resolvePending.push(()=>resolve({data:[],count:0,error:null}));return}resolve({data:table==='profiles'?students:[],count:table==='profiles'?6:0,error:fail&&table!=='profiles'?{message:'offline'}:null})}};return query}})};
const inline=[...read('admin.html').matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(x=>!x[1].includes('src='))[2];
w.eval(inline.replace('boot();','').replace('const sb=','var sb=').replace('const esc=','var esc=').replace('let me=null,students=[]','var me=null,students=[]')+'\nme={full_name:"Professor QA",id:"trainer"};');
await w.dashboard();assert.ok(w.document.querySelector('#dashboardPriorities'));
// Extension may load after the first dashboard render.
w.eval(read('student-alerts.js'));
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setTimeout(r,0));};
await settle();assert.equal(w.document.querySelectorAll('[data-review-student]').length,4);assert.match(w.document.querySelector('#dashboardPriorities').textContent,/6 aluno/);assert.equal(w.document.querySelector('#dashboardPriorities img'),null);
// Subsequent dashboard navigations must also render priorities.
await w.dashboard();await settle();assert.equal(w.document.querySelectorAll('[data-review-student]').length,4);
fail=true;await w.dashboard();await settle();assert.match(w.document.querySelector('#dashboardPriorities').textContent,/Não foi possível/);assert.ok(!w.document.querySelector('#dashboardPriorities').textContent.includes('Tudo em dia'));
fail=false;resolvePending=[];const host=w.document.querySelector('#dashboardPriorities');delete host.dataset.loading;const pending=w.loadDashboardPriorities(host);w.document.querySelector('#view').innerHTML='<h1>Outra tela</h1>';await settle();resolvePending.forEach(fn=>fn());await pending;assert.equal(w.document.querySelector('#view').textContent,'Outra tela');
console.log('PASS: late extension, repeated dashboard visit, four-item limit, escaped name, failure state and stale response protection');
await w.happyDOM.close();
